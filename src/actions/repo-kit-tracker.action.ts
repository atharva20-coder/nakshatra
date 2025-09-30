"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { RepoKitTrackerRow } from "@/types/forms";

// Input type for multiple rows
type RepoKitTrackerInput = Omit<RepoKitTrackerRow, 'id'>[];

export async function saveRepoKitTrackerAction(
  rows: RepoKitTrackerInput,
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
      !row.srNo.trim() || !row.repoKitNo.trim() || !row.lanNo.trim()
    );
    
    if (invalidRow) {
      return { error: "Please fill in all required fields for each row." };
    }

    // Check for existing form
    let existingForm = null;
    
    if (formId) {
      existingForm = await prisma.repoKitTracker.findFirst({
        where: { 
          id: formId,
          userId: userId
        },
        include: { details: true }
      });
    } else {
      existingForm = await prisma.repoKitTracker.findFirst({
        where: { 
          userId: userId,
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

      savedForm = await prisma.repoKitTracker.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: rows.map(row => ({
              srNo: row.srNo.trim(),
              repoKitNo: row.repoKitNo.trim(),
              issueDateFromBank: new Date(row.issueDateFromBank),
              lanNo: row.lanNo.trim(),
              product: row.product,
              bucketDpd: row.bucketDpd,
              usedUnused: row.usedUnused,
              executiveSign: row.executiveSign,
              dateOfReturnToCo: row.dateOfReturnToCo ? new Date(row.dateOfReturnToCo) : null,
              collectionManagerEmpId: row.collectionManagerEmpId,
              collectionManagerSign: row.collectionManagerSign
            }))
          }
        },
        include: { details: true }
      });
    } else {
      savedForm = await prisma.repoKitTracker.create({
        data: {
          userId,
          status: submissionStatus,
          details: {
            create: rows.map(row => ({
              srNo: row.srNo.trim(),
              repoKitNo: row.repoKitNo.trim(),
              issueDateFromBank: new Date(row.issueDateFromBank),
              lanNo: row.lanNo.trim(),
              product: row.product,
              bucketDpd: row.bucketDpd,
              usedUnused: row.usedUnused,
              executiveSign: row.executiveSign,
              dateOfReturnToCo: row.dateOfReturnToCo ? new Date(row.dateOfReturnToCo) : null,
              collectionManagerEmpId: row.collectionManagerEmpId,
              collectionManagerSign: row.collectionManagerSign
            }))
          }
        },
        include: { details: true }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/forms/repoKitTracker");
    revalidatePath(`/forms/repoKitTracker/${savedForm.id}`);
    
    return { 
      success: true,
      formId: savedForm.id,
      status: savedForm.status
    };
  } catch (err) {
    console.error("Error saving Repo Kit Tracker:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function getRepoKitTrackerById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return null;
  }

  try {
    const form = await prisma.repoKitTracker.findFirst({
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
        srNo: detail.srNo,
        repoKitNo: detail.repoKitNo,
        issueDateFromBank: detail.issueDateFromBank.toISOString().split('T')[0],
        lanNo: detail.lanNo,
        product: detail.product,
        bucketDpd: detail.bucketDpd,
        usedUnused: detail.usedUnused,
        executiveSign: detail.executiveSign,
        dateOfReturnToCo: detail.dateOfReturnToCo?.toISOString().split('T')[0] || "",
        collectionManagerEmpId: detail.collectionManagerEmpId,
        collectionManagerSign: detail.collectionManagerSign
      }))
    };
  } catch (error) {
    console.error("Error fetching Repo Kit Tracker:", error);
    return null;
  }
}

export async function getUserRepoKitTrackerForm() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return null;
  }

  try {
    // First check for any draft
    let form = await prisma.repoKitTracker.findFirst({
      where: { 
        userId: session.user.id,
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
      form = await prisma.repoKitTracker.findFirst({
        where: { 
          userId: session.user.id,
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
        repoKitNo: detail.repoKitNo,
        issueDateFromBank: detail.issueDateFromBank.toISOString().split('T')[0],
        lanNo: detail.lanNo,
        product: detail.product,
        bucketDpd: detail.bucketDpd,
        usedUnused: detail.usedUnused,
        executiveSign: detail.executiveSign,
        dateOfReturnToCo: detail.dateOfReturnToCo?.toISOString().split('T')[0] || "",
        collectionManagerEmpId: detail.collectionManagerEmpId,
        collectionManagerSign: detail.collectionManagerSign
      }))
    };
  } catch (error) {
    console.error("Error fetching user's Repo Kit Tracker form:", error);
    return null;
  }
}

export async function deleteRepoKitTrackerAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.repoKitTracker.findFirst({
      where: { id, userId: session.user.id }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    await prisma.repoKitTracker.delete({
      where: { id }
    });

    revalidatePath("/dashboard");
    revalidatePath("/forms/repoKitTracker");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Repo Kit Tracker:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}