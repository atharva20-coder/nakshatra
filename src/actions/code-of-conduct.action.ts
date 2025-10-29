// src/actions/code-of-conduct.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CodeOfConductRow } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action"; // Import resubmission handler
import { createNotificationAction } from "@/actions/notification.action"; // Import notification action
import { logFormActivityAction } from "@/actions/activity-logging.action"; // Import activity logging action

type CodeOfConductInput = Omit<CodeOfConductRow, 'id'>[];

// Helper to determine financial year for annual forms
function getFinancialYear(date: Date): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}


export async function saveCodeOfConductAction(
  rows: CodeOfConductInput,
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

    // --- Validation ---
    if (!rows || rows.length === 0) {
      return { error: "At least one signatory row is required." };
    }
    const invalidRow = rows.find(row =>
      !row.name.trim() || !row.signature.trim() || !row.date.trim()
    );
    if (invalidRow) {
      return { error: "Please fill in all required fields (Name, Signature, Date) for each signatory." };
    }
    // Validate date format if needed
    try {
        rows.forEach(row => new Date(row.date));
    } catch {
        return { error: "Invalid date format found. Please use YYYY-MM-DD." };
    }
    // --- End Validation ---

    const detailsToCreate = rows.map(row => ({
      name: row.name.trim(),
      signature: row.signature.trim(),
      date: new Date(row.date) // Store as DateTime in DB
    }));

    let existingForm = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let oldData: any = null;

    if (formId) {
      existingForm = await prisma.codeOfConduct.findFirst({
        where: { id: formId, userId: userId },
        include: { details: true }
      });
      if (existingForm) {
        oldData = {
          status: existingForm.status,
          detailsCount: existingForm.details.length,
          details: existingForm.details.map(d => ({ name: d.name, signature: d.signature, date: d.date.toISOString().split('T')[0] })) // Store comparable format
        };
      }
    } else {
      // Find latest draft for the current financial year if possible, or any draft
      //const now = new Date();
      //const currentFinancialYearStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);

      existingForm = await prisma.codeOfConduct.findFirst({
        where: {
            userId: userId,
            status: SubmissionStatus.DRAFT,
            // createdAt: { gte: currentFinancialYearStart } // Optional: only find drafts within the current FY
        },
        include: { details: true },
        orderBy: { updatedAt: 'desc' }
      });
       if (existingForm) {
        oldData = {
          status: existingForm.status,
          detailsCount: existingForm.details.length,
          details: existingForm.details.map(d => ({ name: d.name, signature: d.signature, date: d.date.toISOString().split('T')[0] }))
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
      details: rows.map(r => ({ name: r.name, signature: r.signature, date: r.date })) // Use input date string for comparison log
    };


    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED && status === "DRAFT") {
           return { error: "Cannot revert a submitted form to draft directly. Request edit access first." };
      }
       // Check if this is a resubmission (form was DRAFT because it was approved for edit)
      if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED" && formId) {
        wasResubmission = true;
        actionType = ActivityAction.FORM_RESUBMITTED;
        actionDescription = `Resubmitted Code of Conduct after approval`;
      } else if (status === "SUBMITTED") {
          actionType = ActivityAction.FORM_SUBMITTED;
          actionDescription = `Submitted Code of Conduct`;
      } else {
          actionType = ActivityAction.FORM_UPDATED;
          actionDescription = `Updated Code of Conduct draft`;
      }

      savedForm = await prisma.codeOfConduct.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {}, // Clear existing details
            create: detailsToCreate // Add new ones
          }
        },
        include: { details: true }
      });
    } else {
      actionType = ActivityAction.FORM_CREATED;
      actionDescription = `Created Code of Conduct`;

      savedForm = await prisma.codeOfConduct.create({
        data: {
          userId,
          status: submissionStatus,
          details: { create: detailsToCreate }
        },
        include: { details: true }
      });
    }

     // Get financial year for annual form context
    const financialYear = getFinancialYear(savedForm.createdAt);

    // Log activity
    await logFormActivityAction({
        action: actionType,
        entityType: 'codeOfConduct',
        description: actionDescription,
        entityId: savedForm.id,
        metadata: {
            status: submissionStatus,
            detailsCount: rows.length,
            wasResubmission,
            year: financialYear, // Log financial year
            month: "Annual", // Indicate it's annual
            oldValues: oldData,
            newValues: newData
        }
    });

    // Handle resubmission logic (closing approvals, sending notifications)
    if (wasResubmission && savedForm.id) {
        await handleFormResubmissionAction(savedForm.id, 'codeOfConduct');
    } else if (status === "SUBMITTED") {
      // Send standard submission notification only if it wasn't a resubmission
        await createNotificationAction(
            userId,
            NotificationType.FORM_SUBMITTED,
            "Form Submitted",
            `Your Code of Conduct for FY ${financialYear} has been submitted successfully.`,
            `/user/forms/codeOfConduct/${savedForm.id}`,
            savedForm.id,
            "form"
        );
    }

    // Revalidate paths
    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/codeOfConduct");
    revalidatePath(`/user/forms/codeOfConduct/${savedForm.id}`);

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
    console.error("Error saving Code of Conduct:", err);
    // Log detailed error
    if (err instanceof Error) {
        console.error("Error details:", err.message, err.stack);
    }
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function deleteCodeOfConductAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.codeOfConduct.findFirst({
      where: { id, userId: session.user.id },
      include: { details: true } // Include details to log info
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }
    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    // Get financial year
    const financialYear = getFinancialYear(form.createdAt);

    await prisma.codeOfConduct.delete({ where: { id } });

     // Log deletion
    await logFormActivityAction({
        action: ActivityAction.FORM_DELETED,
        entityType: 'codeOfConduct',
        description: `Deleted Code of Conduct draft`,
        entityId: id,
        metadata: {
            year: financialYear,
            month: "Annual",
            detailsCount: form.details.length
        }
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/codeOfConduct");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Code of Conduct:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}

export async function getCodeOfConductById(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }

  try {
    const form = await prisma.codeOfConduct.findFirst({
      where: { id: id, userId: session.user.id },
      include: { details: true }
    });
    if (!form) return null;

    return {
      id: form.id,
      status: form.status,
      // Ensure details have string IDs if needed by the hook
      details: form.details.map(detail => ({
        id: detail.id, // Keep original DB ID
        name: detail.name,
        signature: detail.signature,
        date: detail.date.toISOString().split('T')[0], // Format date to YYYY-MM-DD
      }))
    };
  } catch (error) {
    console.error("Error fetching Code of Conduct:", error);
    return null;
  }
}

export async function getCodeOfConductByIdForAdmin(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    // Admin/Super Admin Check
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
        console.log(`getCodeOfConductByIdForAdmin: Access denied for user ${session?.user?.id} with role ${session?.user?.role}. Required ADMIN or SUPER_ADMIN.`);
        return null; // Or throw an error / return { error: "Forbidden" }
    }

    try {
        console.log(`getCodeOfConductByIdForAdmin: Fetching form ${id} as Admin ${session.user.id}`);
        const form = await prisma.codeOfConduct.findFirst({
            where: { id: id }, // No userId check for admin
            include: {
                details: true,
                user: { // Include the user (agency) details
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!form) {
            console.log(`getCodeOfConductByIdForAdmin: Form ${id} not found.`);
            return null;
        }

        console.log(`getCodeOfConductByIdForAdmin: Form ${id} found. Status: ${form.status}. Agency: ${form.user?.name}`);
        const formattedDetails = form.details.map(detail => ({
            id: detail.id,
            name: detail.name,
            signature: detail.signature,
            date: detail.date.toISOString().split('T')[0],
        }));

        return {
            id: form.id,
            status: form.status,
            // Include agency info in the return object
            agencyInfo: form.user ? { userId: form.user.id, name: form.user.name, email: form.user.email } : undefined,
            details: formattedDetails
        };
    } catch (error) {
        console.error("getCodeOfConductByIdForAdmin: Error fetching Code of Conduct:", error);
        return null;
    }
}