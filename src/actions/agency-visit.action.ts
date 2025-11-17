// src/actions/agency-visit.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, ActivityAction, NotificationType, Prisma } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AgencyTableRow, FORM_CONFIGS, FormType } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getMonthYearAsNumbers, getMonthName } from "@/lib/date-utils";

type AgencyVisitInput = Omit<AgencyTableRow, 'id'>[];

// ---
// Business Logic Duplicated from monthly-refresh.action.ts
// ---

const prismaModelMap: Record<FormType, keyof typeof prisma> = {
  codeOfConduct: "codeOfConduct",
  declarationCumUndertaking: "declarationCumUndertaking",
  agencyVisits: "agencyVisit",
  monthlyCompliance: "monthlyCompliance",
  assetManagement: "assetManagement",
  telephoneDeclaration: "telephoneDeclaration",
  manpowerRegister: "agencyManpowerRegister",
  productDeclaration: "productDeclaration",
  penaltyMatrix: "agencyPenaltyMatrix",
  trainingTracker: "agencyTrainingTracker",
  proactiveEscalation: "proactiveEscalationTracker",
  escalationDetails: "escalationDetails",
  paymentRegister: "paymentRegister",
  repoKitTracker: "repoKitTracker",
  noDuesDeclaration:'noDuesDeclaration',
};

function getPrismaDelegate<T extends FormType>(formType: T) {
  const modelName = prismaModelMap[formType];
  return prisma[modelName as keyof typeof prisma] as {
    findFirst: (args: unknown) => Promise<{
      id: string;
      createdAt: Date;
      updatedAt: Date;
      status: SubmissionStatus;
    } | null>;
  };
}

/**
 * Check if agency has overdue forms for a specific month
 * (As defined in monthly-refresh.action.ts)
 */
async function checkForOverdueForms(
  userId: string,
  month: number,
  year: number
): Promise<{
  hasOverdue: boolean;
  overdueCount: number;
  overdueFormsList: string[];
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const overdueFormsList: string[] = [];

  for (const [formType, config] of Object.entries(FORM_CONFIGS) as [
    FormType,
    (typeof FORM_CONFIGS)[FormType]
  ][]) {
    // Only check required forms
    if (!config.isRequired) continue;

    const model = getPrismaDelegate(formType);
    const userField = ["agencyVisits", "monthlyCompliance", "noDuesDeclaration"].includes(formType)
      ? "agencyId"
      : "userId";

    const form = await model.findFirst({
      where: {
        [userField]: userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { status: true }
    } as object);

    // Form is overdue if it doesn't exist OR it's not submitted
    if (!form || form.status !== SubmissionStatus.SUBMITTED) {
      overdueFormsList.push(config.title);
    }
  }

  return {
    hasOverdue: overdueFormsList.length > 0,
    overdueCount: overdueFormsList.length,
    overdueFormsList
  };
}

// ---
// END OF DUPLICATED LOGIC
// ---

/**
 * Save or update an Agency Visit form
 */
export async function saveAgencyVisitAction(
  rows: AgencyVisitInput,
  status: "DRAFT" | "SUBMITTED",
  formId?: string | null
  // targetMonth and targetYear are REMOVED to enforce read-only logic for back-dated forms.
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const submissionStatus = status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
    const userId = session.user.id; 

    // --- Validation ---
    if (!rows || rows.length === 0) {
      return { error: "At least one visit entry is required." };
    }
    const invalidRow = rows.some(
      row => !row.srNo?.trim() ||
             !row.dateOfVisit?.trim() ||
             !row.employeeId?.trim() ||
             !row.employeeName?.trim() ||
             !row.mobileNo?.trim() ||
             !row.branchLocation?.trim() ||
             !row.product?.trim() ||
             !row.bucketDpd?.trim() ||
             !row.timeIn?.trim() ||
             !row.purposeOfVisit?.trim()
    );
    if (invalidRow) {
       return { error: "Please fill in all required fields marked with * for each visit." };
    }
    // --- End Validation ---

    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      dateOfVisit: row.dateOfVisit,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      mobileNo: row.mobileNo,
      branchLocation: row.branchLocation,
      product: row.product,
      bucketDpd: row.bucketDpd,
      timeIn: row.timeIn,
      timeOut: row.timeOut || "",
      signature: row.signature || "",
      purposeOfVisit: row.purposeOfVisit,
    }));

    let existingForm = null;
    let oldData: Record<string, unknown> | null = null;

    if (formId) {
      existingForm = await prisma.agencyVisit.findFirst({
        where: { id: formId, agencyId: userId },
        include: { details: true }
      });
        if (existingForm) {
            oldData = {
                status: existingForm.status,
                detailsCount: existingForm.details.length,
                 details: existingForm.details.map(d => ({
                    srNo: d.srNo,
                    employeeName: d.employeeName,
                    dateOfVisit: d.dateOfVisit,
                    timeOut: d.timeOut,
                    signature: d.signature
                 }))
            };
        }
    }

    let savedForm;
    let wasResubmission = false;
    let actionType: ActivityAction;
    let actionDescription: string;

     const newData: Record<string, unknown> = {
        status: submissionStatus,
        detailsCount: rows.length,
        details: detailsToCreate.map(d => ({
             srNo: d.srNo,
             employeeName: d.employeeName,
             dateOfVisit: d.dateOfVisit,
             timeOut: d.timeOut,
             signature: d.signature
        }))
    };

    if (existingForm) {
        if (existingForm.status === SubmissionStatus.SUBMITTED && status === "DRAFT") {
           return { error: "Cannot revert a submitted form to draft directly. Request edit access first." };
        }

        if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED" && formId) {
            wasResubmission = true;
            actionType = ActivityAction.FORM_RESUBMITTED;
            actionDescription = `Resubmitted Agency Visit Details after approval`;
        } else if (status === "SUBMITTED") {
            actionType = ActivityAction.FORM_SUBMITTED;
            actionDescription = `Submitted Agency Visit Details`;
        } else {
            actionType = ActivityAction.FORM_UPDATED;
            actionDescription = `Updated Agency Visit Details draft`;
        }

      savedForm = await prisma.agencyVisit.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
              deleteMany: {},
              create: detailsToCreate 
          }
        },
         include: { details: true } 
      });
    } else {
        actionType = ActivityAction.FORM_CREATED;
        actionDescription = `Created Agency Visit Details`;

      // No targetMonth/targetYear, createdAt will use default(now())
      savedForm = await prisma.agencyVisit.create({
        data: {
          agencyId: userId, 
          status: submissionStatus,
          details: {
              create: detailsToCreate 
          }
        },
         include: { details: true } 
      });
    }

    const { month, year } = getMonthYearAsNumbers(savedForm.createdAt);

    // Log activity
    await logFormActivityAction({
        action: actionType,
        entityType: 'agencyVisits', 
        description: actionDescription,
        entityId: savedForm.id,
        metadata: {
            status: submissionStatus,
            detailsCount: rows.length,
            wasResubmission,
            month: String(month),
            year: String(year),
            // FIX: This is the type-safe way to handle this.
            oldValues: oldData ?? undefined,
            newValues: newData
        }
    });

    // Handle resubmission logic
     if (wasResubmission && savedForm.id) {
        await handleFormResubmissionAction(savedForm.id, 'agencyVisits');
    } else if (status === "SUBMITTED") {
       // Send standard submission notification
        await createNotificationAction(
            userId,
            NotificationType.FORM_SUBMITTED,
            "Form Submitted",
            `Your Agency Visit Details for ${getMonthName(month)} ${year} have been submitted successfully.`,
            `/user/forms/agencyVisits/${savedForm.id}`,
            savedForm.id,
            "form"
        );
    }

    // Revalidate paths
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/agencyVisits/${savedForm.id}`); 

     return {
        success: true,
        formId: savedForm.id,
        message: wasResubmission
            ? "Form resubmitted successfully. It is now locked."
            : status === "SUBMITTED"
                ? "Form submitted successfully."
                : "Draft saved successfully."
    };
  } catch (error) { 
    console.error("Error saving Agency Visit:", error);
     if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack); 
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`Prisma error code: ${error.code}`);
        return { error: `A database error occurred while saving the form.` };
    }
    return { error: "An unknown error occurred while saving the form." };
  }
}

/**
 * Delete an Agency Visit draft
 */
export async function deleteAgencyVisitAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.agencyVisit.findFirst({
      where: { id, agencyId: session.user.id },
      include: { details: true }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }
    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    const { month, year } = getMonthYearAsNumbers(form.createdAt);

    await prisma.agencyVisit.delete({ where: { id } });

    // Log deletion
    await logFormActivityAction({
        action: ActivityAction.FORM_DELETED,
        entityType: 'agencyVisits',
        description: `Deleted Agency Visit Details draft`,
        entityId: id,
        metadata: {
            month: String(month),
            year: String(year),
            detailsCount: form.details.length
        }
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/agencyVisits");
    return { success: true };
  } catch (error) { 
    console.error("Error deleting Agency Visit:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}

/**
 * Get a specific Agency Visit form by its ID (for user)
 */
export async function getAgencyVisitById(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }
  try {
    const form = await prisma.agencyVisit.findFirst({
      where: { id: id, agencyId: session.user.id }, 
      include: { details: true }
    });
    if (!form) return null;

    const formattedDetails = form.details.map(detail => ({
        id: detail.id,
        srNo: detail.srNo || "",
        dateOfVisit: detail.dateOfVisit ? new Date(detail.dateOfVisit).toISOString().split('T')[0] : '',
        employeeId: detail.employeeId || "",
        employeeName: detail.employeeName || "",
        mobileNo: detail.mobileNo || "",
        branchLocation: detail.branchLocation || "",
        product: detail.product || "",
        bucketDpd: detail.bucketDpd || "",
        timeIn: detail.timeIn || "",
        timeOut: detail.timeOut || "",
        signature: detail.signature || "",
        purposeOfVisit: detail.purposeOfVisit || "",
    }));

    return {
      id: form.id,
      status: form.status,
      createdAt: form.createdAt,
      details: formattedDetails
    };
  } catch (error) { 
    console.error("Error fetching Agency Visit:", error);
    return null;
  }
}

/**
 * Get a specific Agency Visit form by its ID (for admin)
 */
export async function getAgencyVisitByIdForAdmin(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "COLLECTION_MANAGER"
    )) {
        return null;
    }

    try {
        const form = await prisma.agencyVisit.findFirst({
            where: { id: id }, // No agencyId check for admin
            include: {
                details: true,
                agency: { 
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!form) {
            return null;
        }

        const formattedDetails = form.details.map(detail => ({
            id: detail.id,
            srNo: detail.srNo || "",
            dateOfVisit: detail.dateOfVisit ? new Date(detail.dateOfVisit).toISOString().split('T')[0] : '',
            employeeId: detail.employeeId || "",
            employeeName: detail.employeeName || "",
            mobileNo: detail.mobileNo || "",
            branchLocation: detail.branchLocation || "",
            product: detail.product || "",
            bucketDpd: detail.bucketDpd || "",
            timeIn: detail.timeIn || "",
            timeOut: detail.timeOut || "",
            signature: detail.signature || "",
            purposeOfVisit: detail.purposeOfVisit || "",
        }));

        return {
            id: form.id,
            status: form.status,
            createdAt: form.createdAt,
            agencyInfo: form.agency ? { userId: form.agency.id, name: form.agency.name, email: form.agency.email } : undefined,
            details: formattedDetails
        };
    } catch (error) {
        console.error("getAgencyVisitByIdForAdmin: Error fetching Agency Visit:", error);
        return null;
    }
}

/**
 * Get an Agency Visit form by month and year, checking eligibility
 */
export async function getAgencyVisitByMonthYear(month: number, year: number) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null; // Not authorized
  }

  try {
    const userId = session.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // --- Eligibility Check ---
    const isAccessingCurrentMonth = (year === currentYear && month === currentMonth);
    const isAccessingFutureMonth = (year > currentYear || (year === currentYear && month > currentMonth));

    if (isAccessingCurrentMonth || isAccessingFutureMonth) {
      // User is trying to access a new form. Check if they are eligible.
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      const overdueCheck = await checkForOverdueForms(userId, prevMonth, prevYear);
      
      if (overdueCheck.hasOverdue) {
        // User is INELIGIBLE. Return an error.
        return {
          error: "OVERDUE",
          message: `Forms for ${getMonthName(month)} ${year} are locked.`,
          details: `You must submit ${overdueCheck.overdueCount} overdue form(s) from ${getMonthName(prevMonth)} ${prevYear} to unlock new forms.`,
          overdueFormsList: overdueCheck.overdueFormsList
        };
      }
    }
    // --- End Eligibility Check ---
    
    // User is eligible, or is viewing a past month. Proceed to find the form.
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    const form = await prisma.agencyVisit.findFirst({
      where: {
        agencyId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate, 
        },
      },
      include: { details: true },
      orderBy: {
        createdAt: "desc", 
      },
    });

    if (!form) {
      return null; // Eligible, but no form exists
    }

    // Form found, format and return it
    const formattedDetails = form.details.map((detail) => ({
      id: detail.id,
      srNo: detail.srNo || "",
      dateOfVisit: detail.dateOfVisit ? new Date(detail.dateOfVisit).toISOString().split('T')[0] : '',
      employeeId: detail.employeeId || "",
      employeeName: detail.employeeName || "",
      mobileNo: detail.mobileNo || "",
      branchLocation: detail.branchLocation || "",
      product: detail.product || "",
      bucketDpd: detail.bucketDpd || "",
      timeIn: detail.timeIn || "",
      timeOut: detail.timeOut || "",
      signature: detail.signature || "",
      purposeOfVisit: detail.purposeOfVisit || "",
    }));

    return {
      id: form.id,
      status: form.status,
      createdAt: form.createdAt,
      details: formattedDetails,
    };
  } catch (error) {
    console.error("Error fetching Agency Visit by month/year:", error);
    return null; // Return null on general error
  }
}