// src/actions/agency-visit.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, ActivityAction, NotificationType, Prisma } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AgencyTableRow } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getMonthYearFromDate } from "@/lib/date-utils";

type AgencyVisitInput = Omit<AgencyTableRow, 'id'>[];

export async function saveAgencyVisitAction(
  rows: AgencyVisitInput,
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
    const userId = session.user.id; // agencyId for this specific form

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
    // Add date/time format validation if necessary
    // --- End Validation ---

    // Sanitize and prepare data for Prisma
    // Ensure timeOut and signature are strings, defaulting to empty string if null/undefined
    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      dateOfVisit: row.dateOfVisit, // Keep as string if schema expects String
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      mobileNo: row.mobileNo,
      branchLocation: row.branchLocation,
      product: row.product,
      bucketDpd: row.bucketDpd,
      timeIn: row.timeIn, // Keep as string if schema expects String
      timeOut: row.timeOut || "", // Default to empty string
      signature: row.signature || "", // Default to empty string
      purposeOfVisit: row.purposeOfVisit,
    }));

    let existingForm = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let oldData: any = null;

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
    } else {
      // Find the most recent draft to potentially update
      existingForm = await prisma.agencyVisit.findFirst({
        where: { agencyId: userId, status: SubmissionStatus.DRAFT },
        include: { details: true },
         orderBy: { updatedAt: 'desc' }
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

     const newData = {
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
              create: detailsToCreate // Prisma expects an array of create inputs here
          }
        },
         include: { details: true } // Include details to get dates
      });
    } else {
        actionType = ActivityAction.FORM_CREATED;
        actionDescription = `Created Agency Visit Details`;

      savedForm = await prisma.agencyVisit.create({
        data: {
          agencyId: userId, // Use agencyId field for this model
          status: submissionStatus,
          details: {
              create: detailsToCreate // Prisma expects an array of create inputs here
          }
        },
         include: { details: true } // Include details to get dates
      });
    }

    // Use form's creation date for consistent monthly context
    const { month, year } = getMonthYearFromDate(savedForm.createdAt);

    // Log activity
    await logFormActivityAction({
        action: actionType,
        entityType: 'agencyVisits', // Match key in FORM_CONFIGS
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
        await handleFormResubmissionAction(savedForm.id, 'agencyVisits');
    } else if (status === "SUBMITTED") {
       // Send standard submission notification only if it wasn't a resubmission
        await createNotificationAction(
            userId,
            NotificationType.FORM_SUBMITTED,
            "Form Submitted",
            `Your Agency Visit Details for ${month} ${year} have been submitted successfully.`,
            `/user/forms/agencyVisits/${savedForm.id}`,
            savedForm.id,
            "form"
        );
    }

    // Revalidate paths to update caches
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/agencyVisits`); // List page if exists
    revalidatePath(`/user/forms/agencyVisits/${savedForm.id}`); // Specific form page

     return {
        success: true,
        formId: savedForm.id,
        message: wasResubmission
            ? "Form resubmitted successfully. It is now locked."
            : status === "SUBMITTED"
                ? "Form submitted successfully."
                : "Draft saved successfully."
    };
  } catch (error) { // Changed 'err' to 'error'
    console.error("Error saving Agency Visit:", error);
     if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack); // Changed 'err' to 'error'
    }
    // Provide a more specific error message if it's a known Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // You can add checks for specific Prisma error codes if needed
        return { error: `Database error occurred while saving: ${error.message}` };
    }
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function deleteAgencyVisitAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.agencyVisit.findFirst({
      where: { id, agencyId: session.user.id }, // Correct field
      include: { details: true }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }
    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    const { month, year } = getMonthYearFromDate(form.createdAt);

    // Delete the main form record, cascading delete should handle details
    await prisma.agencyVisit.delete({ where: { id } });

    // Log deletion
    await logFormActivityAction({
        action: ActivityAction.FORM_DELETED,
        entityType: 'agencyVisits',
        description: `Deleted Agency Visit Details draft`,
        entityId: id,
        metadata: {
            month,
            year,
            detailsCount: form.details.length
        }
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/forms/agencyVisits");
    return { success: true };
  } catch (error) { // Changed 'err' to 'error'
    console.error("Error deleting Agency Visit:", error);
     if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack); // Changed 'err' to 'error'
    }
    return { error: "An unknown error occurred while deleting the form." };
  }
}

export async function getAgencyVisitById(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }
  try {
    const form = await prisma.agencyVisit.findFirst({
      where: { id: id, agencyId: session.user.id }, // Use agencyId
      include: { details: true }
    });
    if (!form) return null;

     // Convert details for consistency
    const formattedDetails = form.details.map(detail => ({
        id: detail.id,
        srNo: detail.srNo || "",
        // Ensure dateOfVisit is formatted as YYYY-MM-DD for the input type="date"
        dateOfVisit: detail.dateOfVisit ? new Date(detail.dateOfVisit).toISOString().split('T')[0] : '',
        employeeId: detail.employeeId || "",
        employeeName: detail.employeeName || "",
        mobileNo: detail.mobileNo || "",
        branchLocation: detail.branchLocation || "",
        product: detail.product || "",
        bucketDpd: detail.bucketDpd || "",
        timeIn: detail.timeIn || "", // Ensure time is formatted as HH:MM for input type="time"
        timeOut: detail.timeOut || "", // Ensure time is formatted as HH:MM
        signature: detail.signature || "",
        purposeOfVisit: detail.purposeOfVisit || "",
    }));

    return {
      id: form.id,
      status: form.status,
      details: formattedDetails
    };
  } catch (error) { // Changed 'err' to 'error'
    console.error("Error fetching Agency Visit:", error);
    return null;
  }
}

export async function getAgencyVisitByIdForAdmin(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    // Admin/Super Admin Check
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "COLLECTION_MANAGER"
    )) {
        return null;
    }

    try {
        console.log(`getAgencyVisitByIdForAdmin: Fetching form ${id} as Admin ${session.user.id}`);
        const form = await prisma.agencyVisit.findFirst({
            where: { id: id }, // No agencyId check for admin
            include: {
                details: true,
                agency: { // Include the agency (user) details
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!form) {
            return null;
        }
        // Format details consistently
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
            // Include agency info in the return object
            agencyInfo: form.agency ? { userId: form.agency.id, name: form.agency.name, email: form.agency.email } : undefined,
            details: formattedDetails
        };
    } catch (error) {
        console.error("getAgencyVisitByIdForAdmin: Error fetching Agency Visit:", error);
        return null;
    }
}