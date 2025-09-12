"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AssetManagementRow } from "@/types/forms";

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

    if (!rows || rows.length === 0) {
      return { error: "At least one row is required." };
    }

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
    if (formId) {
      existingForm = await prisma.assetManagement.findFirst({
        where: { id: formId, userId: userId },
      });
    } else {
      existingForm = await prisma.assetManagement.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
      });
    }
    
    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot edit a submitted form." };
      }
      savedForm = await prisma.assetManagement.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: detailsToCreate,
          },
        },
      });
    } else {
      savedForm = await prisma.assetManagement.create({
        data: {
          userId,
          status: submissionStatus,
          details: {
            create: detailsToCreate,
          },
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/forms/assetManagement`);
    revalidatePath(`/forms/assetManagement/${savedForm.id}`);
    
    return { success: true, formId: savedForm.id };
  } catch (err) {
    console.error("Error saving Asset Management:", err);
    return { error: "An unknown error occurred while saving the form." };
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
        ...detail,
      }))
    };
  } catch (error) {
    console.error("Error fetching Asset Management form:", error);
    return null;
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
      where: { id, userId: session.user.id }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    await prisma.assetManagement.delete({
      where: { id }
    });

    revalidatePath("/dashboard");
    revalidatePath("/forms/assetManagement");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Asset Management form:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}

