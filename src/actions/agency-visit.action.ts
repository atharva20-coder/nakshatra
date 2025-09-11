"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AgencyTableRow } from "@/types/forms";

// Input type for multiple rows
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
    const userId = session.user.id;
    
    if (!rows || rows.length === 0) {
      return { error: "At least one row is required." };
    }

    // Validate all rows
    const invalidRow = rows.find(row => 
      !row.employeeId.trim() || !row.employeeName.trim() || !row.dateOfVisit.trim()
    );
    
    if (invalidRow) {
      return { error: "Please fill in all required fields for each row." };
    }

    // Check for existing form
    let existingForm = null;
    
    if (formId) {
      existingForm = await prisma.agencyVisit.findFirst({
        where: { 
          id: formId,
          agencyId: userId
        },
        include: { details: true }
      });
    } else {
      existingForm = await prisma.agencyVisit.findFirst({
        where: { 
          agencyId: userId,
          status: SubmissionStatus.DRAFT
        },
        include: { details: true }
      });
    }

    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot edit a submitted form." };
      }

      savedForm = await prisma.agencyVisit.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: rows.map(row => ({
              srNo: row.srNo,
              dateOfVisit: row.dateOfVisit,
              employeeId: row.employeeId.trim(),
              employeeName: row.employeeName.trim(),
              mobileNo: row.mobileNo,
              branchLocation: row.branchLocation,
              product: row.product,
              bucketDpd: row.bucketDpd,
              timeIn: row.timeIn,
              timeOut: row.timeOut,
              signature: row.signature,
              purposeOfVisit: row.purposeOfVisit
            }))
          }
        },
        include: { details: true }
      });
    } else {
      savedForm = await prisma.agencyVisit.create({
        data: {
          agencyId: userId,
          status: submissionStatus,
          details: {
            create: rows.map(row => ({
              srNo: row.srNo,
              dateOfVisit: row.dateOfVisit,
              employeeId: row.employeeId.trim(),
              employeeName: row.employeeName.trim(),
              mobileNo: row.mobileNo,
              branchLocation: row.branchLocation,
              product: row.product,
              bucketDpd: row.bucketDpd,
              timeIn: row.timeIn,
              timeOut: row.timeOut,
              signature: row.signature,
              purposeOfVisit: row.purposeOfVisit
            }))
          }
        },
        include: { details: true }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/forms/agencyVisits");
    revalidatePath(`/forms/agencyVisits/${savedForm.id}`);
    
    return { 
      success: true,
      formId: savedForm.id,
      status: savedForm.status
    };
  } catch (err) {
    console.error("Error saving Agency Visit:", err);
    return { error: "An unknown error occurred while saving the form." };
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
      where: { 
        id: id, 
        agencyId: session.user.id 
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
        srNo: detail.srNo,
        dateOfVisit: detail.dateOfVisit,
        employeeId: detail.employeeId,
        employeeName: detail.employeeName,
        mobileNo: detail.mobileNo,
        branchLocation: detail.branchLocation,
        product: detail.product,
        bucketDpd: detail.bucketDpd,
        timeIn: detail.timeIn,
        timeOut: detail.timeOut,
        signature: detail.signature,
        purposeOfVisit: detail.purposeOfVisit
      }))
    };
  } catch (error) {
    console.error("Error fetching Agency Visit:", error);
    return null;
  }
}

export async function getUserAgencyVisitForm() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return null;
  }

  try {
    // First check for any draft
    let form = await prisma.agencyVisit.findFirst({
      where: { 
        agencyId: session.user.id,
        status: SubmissionStatus.DRAFT
      },
      include: {
        details: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // If no draft, get the most recent submitted form
    if (!form) {
      form = await prisma.agencyVisit.findFirst({
        where: { 
          agencyId: session.user.id,
          status: SubmissionStatus.SUBMITTED
        },
        include: {
          details: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    }

    if (!form) {
      return null;
    }

    return {
      id: form.id,
      status: form.status,
      details: form.details.map(detail => ({
        id: detail.id,
        srNo: detail.srNo,
        dateOfVisit: detail.dateOfVisit,
        employeeId: detail.employeeId,
        employeeName: detail.employeeName,
        mobileNo: detail.mobileNo,
        branchLocation: detail.branchLocation,
        product: detail.product,
        bucketDpd: detail.bucketDpd,
        timeIn: detail.timeIn,
        timeOut: detail.timeOut,
        signature: detail.signature,
        purposeOfVisit: detail.purposeOfVisit
      }))
    };
  } catch (error) {
    console.error("Error fetching user's Agency Visit form:", error);
    return null;
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
      where: { id, agencyId: session.user.id }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    await prisma.agencyVisit.delete({
      where: { id }
    });

    revalidatePath("/dashboard");
    revalidatePath("/forms/agencyVisits");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Agency Visit:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}