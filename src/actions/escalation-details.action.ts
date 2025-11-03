/* eslint-disable @typescript-eslint/no-explicit-any */
// src/actions/escalation-details.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, ActivityAction, NotificationType, Prisma } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { EscalationDetailsRow, FORM_CONFIGS } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getMonthYearFromDate } from "@/lib/date-utils";

type EscalationDetailsInput = Omit<EscalationDetailsRow, 'id'>[];

export async function saveEscalationDetailsAction(
  rows: EscalationDetailsInput,
  status: "DRAFT" | "SUBMITTED",
  formId?: string | null
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const submissionStatus = status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
    const userId = session.user.id;

    if (!rows || rows.length === 0) {
      return { error: "At least one escalation entry is required." };
    }

    // --- Validation ---
    const invalidRow = rows.some(
      row => !row.customerName?.trim() ||
             !row.loanCardNo?.trim() ||
             !row.productBucketDpd?.trim() ||
             !row.dateEscalation?.trim() ||
             !row.escalationDetail?.trim() ||
             !row.collectionManagerSign?.trim()
    );
    if (invalidRow) {
       return { error: "Please fill in all required fields marked with * for each entry." };
    }
    // --- End Validation ---

    const detailsToCreate = rows.map(row => ({
      customerName: row.customerName,
      loanCardNo: row.loanCardNo,
      productBucketDpd: row.productBucketDpd,
      dateEscalation: new Date(row.dateEscalation),
      escalationDetail: row.escalationDetail,
      collectionManagerRemark: row.collectionManagerRemark || null,
      collectionManagerSign: row.collectionManagerSign,
    }));

    let existingForm = null;
    let oldData: any = null;

    if (formId) {
      existingForm = await prisma.escalationDetails.findFirst({
        where: { id: formId, userId: userId },
        include: { details: true }
      });
      if (existingForm) {
        oldData = {
          status: existingForm.status,
          detailsCount: existingForm.details.length,
          details: existingForm.details.map(d => ({
            customerName: d.customerName,
            loanCardNo: d.loanCardNo,
            dateEscalation: d.dateEscalation,
          }))
        };
      }
    } else {
      existingForm = await prisma.escalationDetails.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
        include: { details: true },
        orderBy: { updatedAt: 'desc' }
      });
      if (existingForm) {
        oldData = {
          status: existingForm.status,
          detailsCount: existingForm.details.length,
          details: existingForm.details.map(d => ({
            customerName: d.customerName,
            loanCardNo: d.loanCardNo,
            dateEscalation: d.dateEscalation,
          }))
        };
      }
    }

    let savedForm;
    let wasResubmission = false;
    let actionType: ActivityAction;
    let actionDescription: string;

    const newData = {
      status: submissionStatus,
      detailsCount: rows.length,
      details: detailsToCreate.map(d => ({
        customerName: d.customerName,
        loanCardNo: d.loanCardNo,
        dateEscalation: d.dateEscalation,
      }))
    };

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED && status === "DRAFT") {
        return { error: "Cannot revert a submitted form to draft directly. Request edit access first." };
      }

      if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED" && formId) {
        wasResubmission = true;
        actionType = ActivityAction.FORM_RESUBMITTED;
        actionDescription = `Resubmitted Escalation Details after approval`;
      } else if (status === "SUBMITTED") {
        actionType = ActivityAction.FORM_SUBMITTED;
        actionDescription = `Submitted Escalation Details`;
      } else {
        actionType = ActivityAction.FORM_UPDATED;
        actionDescription = `Updated Escalation Details draft`;
      }

      savedForm = await prisma.escalationDetails.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: detailsToCreate,
          }
        },
        include: { details: true }
      });
    } else {
      actionType = ActivityAction.FORM_CREATED;
      actionDescription = `Created Escalation Details`;

      savedForm = await prisma.escalationDetails.create({
        data: {
          userId: userId,
          status: submissionStatus,
          details: {
            create: detailsToCreate,
          }
        },
        include: { details: true }
      });
    }

    const { month, year } = getMonthYearFromDate(savedForm.createdAt);

    await logFormActivityAction({
      action: actionType,
      entityType: 'escalationDetails',
      description: actionDescription,
      entityId: savedForm.id,
      metadata: {
        status: submissionStatus,
        detailsCount: rows.length,
        wasResubmission,
        month,
        year,
        oldValues: oldData,
        newValues: newData
      }
    });

    if (wasResubmission && savedForm.id) {
      await handleFormResubmissionAction(savedForm.id, 'escalationDetails');
    } else if (status === "SUBMITTED") {
      await createNotificationAction(
        userId,
        NotificationType.FORM_SUBMITTED,
        "Form Submitted",
        `Your Escalation Details form for ${month} ${year} has been submitted successfully.`,
        `/user/forms/escalationDetails/${savedForm.id}`,
        savedForm.id,
        "form"
      );
    }

    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/escalationDetails`);
    revalidatePath(`/user/forms/escalationDetails/${savedForm.id}`);

    return {
      success: true,
      formId: savedForm.id,
      message: wasResubmission
          ? "Form resubmitted successfully. It is now locked."
          : status === "SUBMITTED"
              ? "Form submitted successfully."
              : "Draft saved successfully."
    };
  } catch (err) {
    console.error("Error saving Escalation Details:", err);
    if (err instanceof Error) {
        console.error("Error details:", err.message, err.stack);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return { error: `Database error occurred while saving: ${err.message}` };
    }
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function deleteEscalationDetailsAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: you must be logged in" };
  }

  try {
    const form = await prisma.escalationDetails.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: { details: true }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    const { month, year } = getMonthYearFromDate(form.createdAt);

    await prisma.escalationDetails.delete({
      where: { id: id }
    });

    await logFormActivityAction({
        action: ActivityAction.FORM_DELETED,
        entityType: 'escalationDetails',
        description: `Deleted Escalation Details draft`,
        entityId: id,
        metadata: {
            month,
            year,
            detailsCount: form.details.length
        }
    });

    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/escalationDetails`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Escalation Details:", error);
    return { error: "An unknown error occurred while deleting the form" };
  }
}

export async function getEscalationDetailsById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null;
  }

  try {
    const form = await prisma.escalationDetails.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        details: true
      }
    });

    if (!form) {
      return null;
    }

    return {
      id: form.id,
      status: form.status,
      details: form.details.map(detail => ({
        id: detail.id,
        customerName: detail.customerName,
        loanCardNo: detail.loanCardNo,
        productBucketDpd: detail.productBucketDpd,
        dateEscalation: new Date(detail.dateEscalation).toISOString().split('T')[0],
        escalationDetail: detail.escalationDetail,
        collectionManagerRemark: detail.collectionManagerRemark || "",
        collectionManagerSign: detail.collectionManagerSign,
      }))
    };
  } catch (error) {
    console.error("Error fetching Escalation Details:", error);
    return null;
  }
}

export async function getEscalationDetailsByIdForAdmin(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
        return null;
    }

    try {
        const form = await prisma.escalationDetails.findFirst({
            where: { id: id },
            include: {
                details: true,
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!form) {
            return null;
        }

        const formattedDetails = form.details.map(detail => ({
            id: detail.id,
            customerName: detail.customerName,
            loanCardNo: detail.loanCardNo,
            productBucketDpd: detail.productBucketDpd,
            dateEscalation: new Date(detail.dateEscalation).toISOString().split('T')[0],
            escalationDetail: detail.escalationDetail,
            collectionManagerRemark: detail.collectionManagerRemark || "",
            collectionManagerSign: detail.collectionManagerSign,
        }));

        return {
            id: form.id,
            status: form.status,
            agencyInfo: form.user ? { userId: form.user.id, name: form.user.name, email: form.user.email } : undefined,
            details: formattedDetails
        };
    } catch (error) {
        console.error("getEscalationDetailsByIdForAdmin: Error fetching Escalation Details:", error);
        return null;
    }
}