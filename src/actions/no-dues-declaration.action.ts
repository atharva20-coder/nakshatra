// src/actions/no-dues-declaration.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SubmissionStatus,
  ActivityAction,
  NotificationType,
  Prisma,
  NoDuesDeclaration,
  NoDuesDetail,
} from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getMonthYearFromDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/utils";

// -----------------------------
// Interfaces
// -----------------------------

export interface NoDuesDetailInput {
  id?: string; // Will be present when updating
  productBucket: string;
  month: string;
  remarksBillAmount: string;
}

export interface NoDuesDeclarationSaveData {
  month: number;
  year: number;
  details: NoDuesDetailInput[];
}

// --- Typed alias for saved form ---
type SavedFormType = (NoDuesDeclaration & {
  details: NoDuesDetail[];
}) | null;

// -----------------------------
// Save or submit Declaration
// -----------------------------
export async function saveNoDuesDeclarationAction(
  data: NoDuesDeclarationSaveData,
  status: "DRAFT" | "SUBMITTED",
  formId?: string | null
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return { error: "Unauthorized: You must be logged in." };

  try {
    const submissionStatus =
      status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
    const agencyId = session.user.id;
    const { month, year, details } = data;

    // Validation
    if (!details || details.length === 0) {
      return { error: "At least one declaration detail is required." };
    }
    
    // Existing form check
    const existingForm = formId
      ? await prisma.noDuesDeclaration.findFirst({
          where: { id: formId, agencyId },
          include: { details: true },
        })
      : await prisma.noDuesDeclaration.findFirst({
          where: { agencyId, month, year },
          include: { details: true },
        });

    // --- Check approvals *before* transaction if submitting ---
    if (status === SubmissionStatus.SUBMITTED) {
      const formToValidateId = existingForm?.id || formId;
      if (!formToValidateId) {
        return { error: "You must save the form as a draft before submitting." };
      }
      
      const approvals = await prisma.cMApproval.findMany({
        where: {
          formId: formToValidateId,
          formType: "noDuesDeclaration",
          agencyId: agencyId,
        },
      });
      const approvedRowIds = new Set(approvals.map(a => a.rowId));
      
      // Check rows from the *database* (if form exists) or from payload
      const rowsToCheck = existingForm ? existingForm.details : details;
      
      const unapprovedRows = rowsToCheck.filter(
        (detail) => !detail.id || !approvedRowIds.has(detail.id)
      );

      if (unapprovedRows.length > 0) {
        return { error: `You have ${unapprovedRows.length} item(s) that must be approved by a Collection Manager before submitting.` };
      }
    }

    const oldData = existingForm
      ? {
          status: existingForm.status,
          detailsCount: existingForm.details.length,
          details: existingForm.details.map((d) => ({
            productBucket: d.productBucket,
            month: d.month,
            remarks: d.remarksBillAmount,
          })),
        }
      : undefined;

    let wasResubmission = false;
    let actionType: ActivityAction;
    let actionDescription: string;

    const newData = {
      status: submissionStatus,
      month,
      year,
      detailsCount: details.length,
      details: details.map((d) => ({
        productBucket: d.productBucket,
        month: d.month,
        remarks: d.remarksBillAmount,
      })),
    };

    // -----------------------------
    // Transaction
    // -----------------------------
    const savedForm: SavedFormType = await prisma.$transaction(async (tx) => {
      let form: SavedFormType = null;

      if (existingForm) {
        // --- Update existing form ---
        if (existingForm.status === SubmissionStatus.SUBMITTED && status === "DRAFT") {
          throw new Error(
            "Cannot revert a submitted form to draft directly. Request edit access first."
          );
        }

        if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED") {
          wasResubmission = true;
          actionType = ActivityAction.FORM_RESUBMITTED;
          actionDescription = `Resubmitted No Dues Declaration after approval`;
        } else if (status === "SUBMITTED") {
          actionType = ActivityAction.FORM_SUBMITTED;
          actionDescription = `Submitted No Dues Declaration`;
        } else {
          actionType = ActivityAction.FORM_UPDATED;
          actionDescription = `Updated No Dues Declaration draft`;
        }

        form = await tx.noDuesDeclaration.update({
          where: { id: existingForm.id },
          data: {
            status: submissionStatus,
            month,
            year,
          },
          include: { details: true },
        });
      } else {
        // --- Create new form ---
        actionType = ActivityAction.FORM_CREATED;
        actionDescription = `Created No Dues Declaration`;

        form = await tx.noDuesDeclaration.create({
          data: {
            agencyId,
            month,
            year,
            status: submissionStatus,
          },
          include: { details: true },
        });
      }

      // --- Use Upsert to save details (preserves IDs for approvals) ---
      const detailIdsToKeep: string[] = [];
      for (const detail of details) {
        const dataToSave = {
          productBucket: detail.productBucket,
          month: detail.month,
          remarksBillAmount: detail.remarksBillAmount || null,
        };

        const savedDetail = await tx.noDuesDetail.upsert({
          where: {
            id: detail.id && !detail.id.startsWith('new-') ? detail.id : 'dummy-id-for-create',
          },
          create: {
            ...dataToSave,
            formId: form!.id,
          },
          update: dataToSave,
        });
        detailIdsToKeep.push(savedDetail.id);
      }
      
      // Delete details that were removed by the user
      await tx.noDuesDetail.deleteMany({
        where: {
          formId: form!.id,
          id: {
            notIn: detailIdsToKeep,
          },
        },
      });

      // --- Re-fetch saved form with final details ---
      const finalForm = await tx.noDuesDeclaration.findUnique({
        where: { id: form!.id },
        include: { details: true },
      });

      if (!finalForm) throw new Error("Failed to re-fetch saved form.");
      return finalForm;
    });

    if (!savedForm) throw new Error("Form saving failed within transaction.");

    // Post-transaction operations
    const { month: monthName, year: yearString } = getMonthYearFromDate(
      new Date(year, month - 1)
    );
    await logFormActivityAction({
      action: actionType!,
      entityType: "noDuesDeclaration",
      description: actionDescription!,
      entityId: savedForm.id,
      metadata: { ...newData, wasResubmission, month: monthName, year: yearString, oldValues: oldData },
    });
    if (wasResubmission) {
      await handleFormResubmissionAction(savedForm.id, "noDuesDeclaration");
    } else if (status === "SUBMITTED") {
      await createNotificationAction(
        agencyId,
        NotificationType.FORM_SUBMITTED,
        "Form Submitted",
        `Your No Dues Declaration for ${monthName} ${yearString} has been submitted.`,
        `/user/forms/noDuesDeclaration/${savedForm.id}`,
        savedForm.id,
        "form"
      );
    }
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/noDuesDeclaration`);
    revalidatePath(`/user/forms/noDuesDeclaration/${savedForm.id}`);
    
    return {
      success: true,
      formId: savedForm.id,
      message: wasResubmission
        ? "Form resubmitted successfully. It is now locked."
        : status === "SUBMITTED"
        ? "Form submitted successfully."
        : "Draft saved successfully.",
    };
  } catch (err) {
    console.error("Error saving No Dues Declaration:", err);
    return { error: getErrorMessage(err) };
  }
}

// -----------------------------
// NEW ACTION: Save a single approval
// -----------------------------
export async function saveNoDuesApprovalAction(
  formId: string,
  rowId: string, // This is the NoDuesDetail.id
  approvalData: { 
    signature: string;
    timestamp: string;
    collectionManager: {
      name: string;
      email: string;
      designation: string;
      productTag: string;
    };
    remarks?: string; 
  }
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return { error: "Unauthorized" };

  // Get the CM Profile ID from the session
  const cmSessionId = headersList.get("x-cm-session-id");
  if (!cmSessionId) {
    return { error: "Collection Manager session not found. Please log in again." };
  }
  
  const cmProfile = await prisma.collectionManagerProfile.findFirst({
      where: { user: { sessions: { some: { id: cmSessionId } } } }
  });
  if (!cmProfile) {
    return { error: "Invalid Collection Manager session." };
  }
  
  try {
    // Check that the agency owns the form
    const form = await prisma.noDuesDeclaration.findFirst({
      where: {
        id: formId,
        agencyId: session.user.id
      }
    });
    if (!form) {
      return { error: "Form not found or you do not have permission." };
    }

    // Create the approval record
    const newApproval = await prisma.cMApproval.create({
      data: {
        cmProfileId: cmProfile.id,
        agencyId: session.user.id,
        formType: "noDuesDeclaration",
        formId: formId,
        rowId: rowId,
        approvalSignature: approvalData.signature,
        productTag: approvalData.collectionManager.productTag,
        remarks: approvalData.remarks,
        ipAddress: headersList.get("x-forwarded-for")?.split(",")[0].trim(),
        userAgent: headersList.get("user-agent"),
      }
    });

    // Log this specific approval action
    await logFormActivityAction({
      action: ActivityAction.APPROVAL_GRANTED, 
      entityType: "noDuesDeclaration",
      entityId: formId,
      description: `CM ${approvalData.collectionManager.name} approved a 'No Dues' item.`,
      metadata: {
        rowId: rowId,
        formId: formId,
        cmSessionId: cmSessionId,
        approval: approvalData,
      },
    });

    return { success: true, newApproval };

  } catch (error) {
    console.error("Error saving 'No Dues' approval:", error);
    return { error: getErrorMessage(error) };
  }
}


// -----------------------------
// Delete No Dues Declaration draft
// -----------------------------
export async function deleteNoDuesDeclarationAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return { error: "Unauthorized" };

  try {
    const form = await prisma.noDuesDeclaration.findFirst({
      where: { id, agencyId: session.user.id },
    });

    if (!form) return { error: "Form not found or you don't have permission" };
    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    const { month: monthName, year: yearString } = getMonthYearFromDate(
      new Date(form.year, form.month - 1)
    );
    
    // Use transaction to delete details and form
    await prisma.$transaction(async (tx) => {
      await tx.cMApproval.deleteMany({
        where: { formId: id, formType: 'noDuesDeclaration' }
      });
      await tx.noDuesDetail.deleteMany({
        where: { formId: id }
      });
      await tx.noDuesDeclaration.delete({ 
        where: { id } 
      });
    });

    await logFormActivityAction({
      action: ActivityAction.FORM_DELETED,
      entityType: "noDuesDeclaration",
      description: `Deleted No Dues Declaration draft for ${monthName} ${yearString}`,
      entityId: id,
      metadata: { month: monthName, year: yearString },
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/noDuesDeclaration");
    return { success: true };
  } catch (error) {
    console.error("Error deleting No Dues Declaration:", error);
    return { error: getErrorMessage(error) };
  }
}

// -----------------------------
// Get form data for user
// -----------------------------
export async function getNoDuesDeclarationById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return null;

  try {
    const form = await prisma.noDuesDeclaration.findFirst({
      where: { id, agencyId: session.user.id },
      include: { details: true },
    });
    if (!form) return null;

    // Fetch related CM Approvals for this form
    const approvals = await prisma.cMApproval.findMany({
      where: {
        formId: form.id,
        formType: "noDuesDeclaration",
        agencyId: session.user.id,
      }
    });

    return {
      id: form.id,
      status: form.status,
      month: form.month,
      year: form.year,
      details: form.details,
      approvals: approvals, // Send approvals separately
    };
  } catch (error) {
    console.error("Error fetching No Dues Declaration:", error);
    return null;
  }
}

// -----------------------------
// Get form data for Admin
// -----------------------------
export async function getNoDuesDeclarationByIdForAdmin(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return null;
  }

  try {
    const form = await prisma.noDuesDeclaration.findFirst({
      where: { id },
      include: {
        details: true,
        agency: { select: { id: true, name: true, email: true } },
      },
    });
    if (!form) return null;

    // Fetch related CM Approvals for this form
    const approvals = await prisma.cMApproval.findMany({
      where: {
        formId: form.id,
        formType: "noDuesDeclaration",
        agencyId: form.agencyId,
      }
    });

    return {
      id: form.id,
      status: form.status,
      month: form.month,
      year: form.year,
      agencyInfo: form.agency
        ? {
            userId: form.agency.id,
            name: form.agency.name,
            email: form.agency.email,
          }
        : undefined,
      details: form.details,
      approvals: approvals, // Send approvals separately
    };
  } catch (error) {
    console.error("Error fetching No Dues Declaration for Admin:", error);
    return null;
  }
}