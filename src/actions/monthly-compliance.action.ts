// src/actions/monthly-compliance.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SubmissionStatus,
  ActivityAction,
  NotificationType,
  Prisma,
  ComplianceStatus,
  MonthlyCompliance,
  ComplianceResponse,
} from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getMonthYearFromDate } from "@/lib/date-utils";

// -----------------------------
// Interfaces
// -----------------------------

export interface ComplianceResponseInput {
  parameterId: string;
  complied: ComplianceStatus;
  approvals: string | null;
}

export interface MonthlyComplianceSaveData {
  month: number;
  year: number;
  responses: ComplianceResponseInput[];
}

type SavedFormType = (MonthlyCompliance & {
  responses: ComplianceResponse[];
}) | null;

// -----------------------------
// Helper function to get error message
// -----------------------------
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return "An unknown error occurred.";
}

// -----------------------------
// Get active parameters
// -----------------------------
export async function getActiveComplianceParametersAction() {
  try {
    const parameters = await prisma.complianceParameter.findMany({
      where: { isActive: true },
      orderBy: { srNo: "asc" },
    });
    return { success: true, parameters };
  } catch (error) {
    console.error("Error fetching compliance parameters:", error);
    return { error: "Failed to fetch compliance parameters." };
  }
}

// -----------------------------
// Save or submit Monthly Compliance
// -----------------------------
export async function saveMonthlyComplianceAction(
  data: MonthlyComplianceSaveData,
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
    const { month, year, responses } = data;

    if (!responses || responses.length === 0) {
      return { error: "At least one compliance response is required." };
    }
    
    const allParameters = await prisma.complianceParameter.count({
      where: { isActive: true },
    });
    
    if (responses.length < allParameters) {
      return { error: "Please provide a response for all compliance parameters." };
    }

    const existingForm = formId
      ? await prisma.monthlyCompliance.findFirst({
          where: { id: formId, agencyId },
          include: { responses: true },
        })
      : await prisma.monthlyCompliance.findFirst({
          where: { agencyId, month, year },
          include: { responses: true },
        });

    const oldData = existingForm
      ? {
          status: existingForm.status,
          responsesCount: existingForm.responses.length,
          responses: existingForm.responses.map((r) => ({
            pId: r.parameterId,
            complied: r.complied,
            approvals: r.approvals,
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
      responsesCount: responses.length,
      responses: responses.map((r) => ({
        pId: r.parameterId,
        complied: r.complied,
        approvals: r.approvals,
      })),
    };

    const savedForm: SavedFormType = await prisma.$transaction(async (tx) => {
      let form: SavedFormType = null;

      if (existingForm) {
        if (existingForm.status === SubmissionStatus.SUBMITTED && status === "DRAFT") {
          throw new Error(
            "Cannot revert a submitted form to draft directly. Request edit access first."
          );
        }

        if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED") {
          wasResubmission = true;
          actionType = ActivityAction.FORM_RESUBMITTED;
          actionDescription = `Resubmitted Monthly Compliance after approval`;
        } else if (status === "SUBMITTED") {
          actionType = ActivityAction.FORM_SUBMITTED;
          actionDescription = `Submitted Monthly Compliance`;
        } else {
          actionType = ActivityAction.FORM_UPDATED;
          actionDescription = `Updated Monthly Compliance draft`;
        }

        form = await tx.monthlyCompliance.update({
          where: { id: existingForm.id },
          data: {
            status: submissionStatus,
            submittedAt: status === "SUBMITTED" ? new Date() : null,
          },
          include: { responses: true },
        });
      } else {
        actionType = ActivityAction.FORM_CREATED;
        actionDescription = `Created Monthly Compliance`;

        form = await tx.monthlyCompliance.create({
          data: {
            agencyId,
            month,
            year,
            status: submissionStatus,
            submittedAt: status === "SUBMITTED" ? new Date() : null,
          },
          include: { responses: true },
        });
      }

      for (const res of responses) {
        await tx.complianceResponse.upsert({
          where: {
            formId_parameterId: {
              formId: form!.id,
              parameterId: res.parameterId,
            },
          },
          create: {
            formId: form!.id,
            parameterId: res.parameterId,
            complied: res.complied,
            approvals: res.approvals ? res.approvals : Prisma.JsonNull,
            agencyRemarks: null,
            lastUpdatedBy: session.user.id,
          },
          update: {
            complied: res.complied,
            approvals: res.approvals ? res.approvals : Prisma.JsonNull,
            agencyRemarks: null,
            lastUpdatedBy: session.user.id,
          },
        });
      }
      
      const finalForm = await tx.monthlyCompliance.findUnique({
        where: { id: form!.id },
        include: { responses: true },
      });

      if (!finalForm) throw new Error("Failed to re-fetch saved form.");
      return finalForm;
    });

    if (!savedForm) throw new Error("Form saving failed within transaction.");

    const { month: monthName, year: yearString } = getMonthYearFromDate(
      new Date(year, month - 1)
    );
    
    await logFormActivityAction({
      action: actionType!,
      entityType: "monthlyCompliance",
      description: actionDescription!,
      entityId: savedForm.id,
      metadata: { ...newData, wasResubmission, month: monthName, year: yearString, oldValues: oldData },
    });
    
    if (wasResubmission) {
      await handleFormResubmissionAction(savedForm.id, "monthlyCompliance");
    } else if (status === "SUBMITTED") {
      await createNotificationAction(
        agencyId,
        NotificationType.FORM_SUBMITTED,
        "Form Submitted",
        `Your Monthly Compliance form for ${monthName} ${yearString} has been submitted.`,
        `/user/forms/monthlyCompliance/${savedForm.id}`,
        savedForm.id,
        "form"
      );
    }
    
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/monthlyCompliance`);
    revalidatePath(`/user/forms/monthlyCompliance/${savedForm.id}`);
    
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
    console.error("Error saving Monthly Compliance:", err);
    return { error: getErrorMessage(err) };
  }
}

// -----------------------------
// Delete Monthly Compliance draft
// -----------------------------
export async function deleteMonthlyComplianceAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) return { error: "Unauthorized" };

  try {
    const form = await prisma.monthlyCompliance.findFirst({
      where: { id, agencyId: session.user.id },
    });

    if (!form) return { error: "Form not found or you don't have permission" };
    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    const { month: monthName, year: yearString } = getMonthYearFromDate(
      new Date(form.year, form.month - 1)
    );

    await prisma.monthlyCompliance.delete({ where: { id } });

    await logFormActivityAction({
      action: ActivityAction.FORM_DELETED,
      entityType: "monthlyCompliance",
      description: `Deleted Monthly Compliance draft for ${monthName} ${yearString}`,
      entityId: id,
      metadata: { month: monthName, year: yearString },
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/monthlyCompliance");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Monthly Compliance:", error);
    return { error: "An unknown error occurred while deleting." };
  }
}

// -----------------------------
// Get form data for user WITH CM Approvals
// -----------------------------
export async function getMonthlyComplianceById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return null;

  try {
    const form = await prisma.monthlyCompliance.findFirst({
      where: { id, agencyId: session.user.id },
      include: { 
        responses: true,
      },
    });
    
    if (!form) return null;

    const parameters = await prisma.complianceParameter.findMany({
      where: { isActive: true },
      orderBy: { srNo: "asc" },
    });

    // Fetch CM approvals for this form
    const cmApprovals = await prisma.cMApproval.findMany({
      where: {
        formId: id,
        formType: "monthlyCompliance",
        agencyId: session.user.id,
      },
      include: {
        cmProfile: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });

    // Map responses with their CM approval data
    const responsesWithApprovals = form.responses.map(res => {
      const cmApproval = cmApprovals.find(a => a.rowId === res.parameterId);
      
      let approvals = res.approvals as string | null;
      
      // If there's a CM approval in the database, create the approval object
      if (cmApproval && cmApproval.cmProfile.user) {
        const approvalObject = {
          signature: cmApproval.approvalSignature,
          timestamp: cmApproval.createdAt.toISOString(),
          collectionManager: {
            name: cmApproval.cmProfile.user.name,
            email: cmApproval.cmProfile.user.email,
            designation: cmApproval.cmProfile.designation,
            productTag: cmApproval.productTag,
          },
          remarks: cmApproval.remarks || undefined,
        };
        approvals = JSON.stringify(approvalObject);
      }

      return {
        ...res,
        approvals,
      };
    });

    return {
      id: form.id,
      status: form.status,
      month: form.month,
      year: form.year,
      responses: responsesWithApprovals,
      parameters,
    };
  } catch (error) {
    console.error("Error fetching Monthly Compliance:", error);
    return null;
  }
}

// -----------------------------
// Get form data for Admin WITH CM Approvals
// -----------------------------
export async function getMonthlyComplianceByIdForAdmin(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return null;
  }

  try {
    const form = await prisma.monthlyCompliance.findFirst({
      where: { id },
      include: {
        responses: true,
        agency: { select: { id: true, name: true, email: true } },
      },
    });
    
    if (!form) return null;

    const parameters = await prisma.complianceParameter.findMany({
      where: { isActive: true },
      orderBy: { srNo: "asc" },
    });

    // Fetch CM approvals for this form
    const cmApprovals = await prisma.cMApproval.findMany({
      where: {
        formId: id,
        formType: "monthlyCompliance",
      },
      include: {
        cmProfile: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });

    // Map responses with their CM approval data
    const responsesWithApprovals = form.responses.map(res => {
      const cmApproval = cmApprovals.find(a => a.rowId === res.parameterId);
      
      let approvals = res.approvals as string | null;
      
      // If there's a CM approval in the database, create the approval object
      if (cmApproval && cmApproval.cmProfile.user) {
        const approvalObject = {
          signature: cmApproval.approvalSignature,
          timestamp: cmApproval.createdAt.toISOString(),
          collectionManager: {
            name: cmApproval.cmProfile.user.name,
            email: cmApproval.cmProfile.user.email,
            designation: cmApproval.cmProfile.designation,
            productTag: cmApproval.productTag,
          },
          remarks: cmApproval.remarks || undefined,
        };
        approvals = JSON.stringify(approvalObject);
      }

      return {
        ...res,
        approvals,
      };
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
      responses: responsesWithApprovals,
      parameters,
    };
  } catch (error) {
    console.error("Error fetching Monthly Compliance for Admin:", error);
    return null;
  }
}