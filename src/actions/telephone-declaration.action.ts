"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { TelephoneDeclarationRow } from "@/types/forms";

type TelephoneDeclarationInput = Omit<TelephoneDeclarationRow, 'id'>[];

export async function saveTelephoneDeclarationAction(
  rows: TelephoneDeclarationInput,
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
      return { error: "At least one telephone line entry is required." };
    }

    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      telephoneNo: row.telephoneNo,
      username: row.username,
      executiveCategory: row.executiveCategory,
      recordingLine: row.recordingLine,
      remarks: row.remarks || null,
    }));

    let existingForm = null;
    if (formId) {
      existingForm = await prisma.telephoneDeclaration.findFirst({
        where: { id: formId, userId: userId },
      });
    } else {
      existingForm = await prisma.telephoneDeclaration.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
      });
    }

    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot update a submitted form." };
      }

      savedForm = await prisma.telephoneDeclaration.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: detailsToCreate,
          }
        },
      });
    } else {
      savedForm = await prisma.telephoneDeclaration.create({
        data: {
          userId: userId,
          status: submissionStatus,
          details: {
            create: detailsToCreate,
          }
        }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/forms/telephoneDeclaration`);
    revalidatePath(`/forms/telephoneDeclaration/${savedForm.id}`);

    return {
      success: true,
      formId: savedForm.id
    };
  } catch (err) {
    console.error("Error saving Telephone Declaration:", err);
    return { error: "An unknown error occurred while saving the form" };
  }
}

export async function getTelephoneDeclarationById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null;
  }

  try {
    const form = await prisma.telephoneDeclaration.findFirst({
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
        telephoneNo: detail.telephoneNo,
        username: detail.username,
        executiveCategory: detail.executiveCategory,
        recordingLine: detail.recordingLine,
        remarks: detail.remarks || "",
      }))
    };
  } catch (error) {
    console.error("Error fetching Telephone Declaration:", error);
    return null;
  }
}

export async function deleteTelephoneDeclarationAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: you must be logged in" };
  }

  try {
    const form = await prisma.telephoneDeclaration.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    await prisma.telephoneDeclaration.delete({
      where: { id: id }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/forms/telephoneDeclaration`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Telephone Declaration:", error);
    return { error: "An unknown error occurred while deleting the form" };
  }
}