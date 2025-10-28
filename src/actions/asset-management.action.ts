// src/actions/asset-management.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, ActivityAction, NotificationType, Prisma } from "@/generated/prisma"; // Added Prisma import
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AssetManagementRow } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getMonthYearFromDate } from "@/lib/date-utils"; // Import the helper

type AssetManagementInput = Omit<AssetManagementRow, 'id'>[];

export async function saveAssetManagementAction(
  rows: AssetManagementInput,
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
      return { error: "At least one asset entry is required." };
    }
     const invalidRow = rows.some(
      row => !row.srNo?.trim() ||
             !row.systemCpuSerialNo?.trim() ||
             !row.ipAddress?.trim() ||
             !row.executiveName?.trim() ||
             !row.idCardNumber?.trim() ||
             !row.printerAccess?.trim() || // Assuming Yes/No or similar fixed value, check if just presence is needed
             !row.assetDisposed?.trim()
    );
    if (invalidRow) {
      return { error: "Please fill in all required fields marked with * for each asset entry." };
    }
    // --- End Validation ---

    // Prepare data for Prisma
    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      systemCpuSerialNo: row.systemCpuSerialNo,
      ipAddress: row.ipAddress,
      executiveName: row.executiveName,
      idCardNumber: row.idCardNumber,
      printerAccess: row.printerAccess,
      assetDisposed: row.assetDisposed,
    }));

    let existingForm = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let oldData: any = null;

    if (formId) {
      existingForm = await prisma.assetManagement.findFirst({
        where: { id: formId, userId: userId },
        include: { details: true }
      });
       if (existingForm) {
            oldData = {
                status: existingForm.status,
                detailsCount: existingForm.details.length,
                // Capture specific old details if needed for logging comparison
                details: existingForm.details.map(d => ({
                    srNo: d.srNo,
                    systemCpuSerialNo: d.systemCpuSerialNo,
                    ipAddress: d.ipAddress,
                    executiveName: d.executiveName,
                    // Add other relevant fields you want to log changes for
                 }))
            };
        }
    } else {
      // Find the most recent draft to potentially update
      existingForm = await prisma.assetManagement.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
        include: { details: true },
        orderBy: { updatedAt: 'desc' }
      });
       if (existingForm) {
            oldData = {
                status: existingForm.status,
                 detailsCount: existingForm.details.length,
                 details: existingForm.details.map(d => ({
                     srNo: d.srNo,
                     systemCpuSerialNo: d.systemCpuSerialNo,
                     ipAddress: d.ipAddress,
                     executiveName: d.executiveName,
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
        // Log the data being saved for comparison
        details: detailsToCreate.map(d => ({
             srNo: d.srNo,
             systemCpuSerialNo: d.systemCpuSerialNo,
             ipAddress: d.ipAddress,
             executiveName: d.executiveName,
        }))
    };

    if (existingForm) {
        if (existingForm.status === SubmissionStatus.SUBMITTED && status === "DRAFT") {
           return { error: "Cannot revert a submitted form to draft directly. Request edit access first." };
        }

        if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED" && formId) {
            wasResubmission = true;
            actionType = ActivityAction.FORM_RESUBMITTED;
            actionDescription = `Resubmitted Asset Management after approval`;
        } else if (status === "SUBMITTED") {
            actionType = ActivityAction.FORM_SUBMITTED;
            actionDescription = `Submitted Asset Management`;
        } else {
            actionType = ActivityAction.FORM_UPDATED;
            actionDescription = `Updated Asset Management draft`;
        }

      savedForm = await prisma.assetManagement.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
              deleteMany: {}, // Clear old details
              create: detailsToCreate // Create new details
            }
        },
         include: { details: true } // Include details to get dates
      });
    } else {
        actionType = ActivityAction.FORM_CREATED;
        actionDescription = `Created Asset Management`;

      savedForm = await prisma.assetManagement.create({
        data: {
          userId,
          status: submissionStatus,
          details: { create: detailsToCreate }
        },
         include: { details: true } // Include details to get dates
      });
    }

    // Use form's creation date for consistent monthly context
    const { month, year } = getMonthYearFromDate(savedForm.createdAt);

    // Log activity
    await logFormActivityAction({
        action: actionType,
        entityType: 'assetManagement', // Match key in FORM_CONFIGS
        description: actionDescription,
        entityId: savedForm.id,
        metadata: {
            status: submissionStatus,
            detailsCount: rows.length,
            wasResubmission,
            month,
            year,
            oldValues: oldData, // Log previous state
            newValues: newData  // Log new state
        }
    });

    // Handle resubmission logic (close approvals, notify lock)
     if (wasResubmission && savedForm.id) {
        await handleFormResubmissionAction(savedForm.id, 'assetManagement');
    } else if (status === "SUBMITTED") {
       // Send standard submission notification only if it wasn't a resubmission
        await createNotificationAction(
            userId,
            NotificationType.FORM_SUBMITTED,
            "Form Submitted",
            `Your Asset Management form for ${month} ${year} has been submitted successfully.`,
            `/user/forms/assetManagement/${savedForm.id}`,
            savedForm.id,
            "form"
        );
    }

    // Revalidate paths to update caches
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/assetManagement`); // List page if exists
    revalidatePath(`/user/forms/assetManagement/${savedForm.id}`); // Specific form page

    return {
        success: true,
        formId: savedForm.id,
        message: wasResubmission
            ? "Form resubmitted successfully. It is now locked."
            : status === "SUBMITTED"
                ? "Form submitted successfully."
                : "Draft saved successfully."
    };
  } catch (err) { // Consistent error variable 'err'
    console.error("Error saving Asset Management:", err);
     if (err instanceof Error) {
        console.error("Error details:", err.message, err.stack);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return { error: `Database error occurred while saving: ${err.message}` };
    }
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function deleteAssetManagementAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.assetManagement.findFirst({
      where: { id, userId: session.user.id },
      include: { details: true }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }
    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    const { month, year } = getMonthYearFromDate(form.createdAt);

    // Delete the main form record
    await prisma.assetManagement.delete({ where: { id } });

    // Log deletion
    await logFormActivityAction({
        action: ActivityAction.FORM_DELETED,
        entityType: 'assetManagement',
        description: `Deleted Asset Management draft`,
        entityId: id,
        metadata: {
            month,
            year,
            detailsCount: form.details.length
        }
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/assetManagement");
    return { success: true };
  } catch (error) { // Consistent error variable 'error'
    console.error("Error deleting Asset Management form:", error);
     if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
    }
    return { error: "An unknown error occurred while deleting the form." };
  }
}

export async function getAssetManagementById(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }
  try {
    const form = await prisma.assetManagement.findFirst({
      where: { id: id, userId: session.user.id },
      include: { details: true }
    });
    if (!form) return null;

     // Prepare details for the frontend, ensuring consistency
    const formattedDetails = form.details.map(detail => ({
        id: detail.id, // Keep original DB ID
        srNo: detail.srNo || "",
        systemCpuSerialNo: detail.systemCpuSerialNo || "",
        ipAddress: detail.ipAddress || "",
        executiveName: detail.executiveName || "",
        idCardNumber: detail.idCardNumber || "",
        printerAccess: detail.printerAccess || "", // Ensure it's a string
        assetDisposed: detail.assetDisposed || "",
    }));

    return {
      id: form.id,
      status: form.status,
      details: formattedDetails
    };
  } catch (error) { // Consistent error variable 'error'
    console.error("Error fetching Asset Management form:", error);
    return null;
  }
}