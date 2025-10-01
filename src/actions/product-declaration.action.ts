"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ProductDeclarationRow } from "@/types/forms";

type ProductDeclarationInput = Omit<ProductDeclarationRow, 'id'>[];

export async function saveProductDeclarationAction(
  rows: ProductDeclarationInput,
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
      return { error: "At least one product declaration entry is required." };
    }

    const detailsToCreate = rows.map(row => ({
      product: row.product,
      bucket: row.bucket,
      countOfCaseAllocated: parseInt(row.countOfCaseAllocated, 10) || 0,
      collectionManagerName: row.collectionManagerName,
      collectionManagerLocation: row.collectionManagerLocation,
      cmSign: row.cmSign,
    }));

    let existingForm = null;
    if (formId) {
      existingForm = await prisma.productDeclaration.findFirst({
        where: { id: formId, userId: userId },
      });
    } else {
      existingForm = await prisma.productDeclaration.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
      });
    }

    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot update a submitted form." };
      }

      savedForm = await prisma.productDeclaration.update({
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
      savedForm = await prisma.productDeclaration.create({
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
    revalidatePath(`/forms/productDeclaration`);
    revalidatePath(`/forms/productDeclaration/${savedForm.id}`);

    return {
      success: true,
      formId: savedForm.id
    };
  } catch (err) {
    console.error("Error saving Product Declaration:", err);
    return { error: "An unknown error occurred while saving the form" };
  }
}

export async function getProductDeclarationById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null;
  }

  try {
    const form = await prisma.productDeclaration.findFirst({
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
        product: detail.product,
        bucket: detail.bucket,
        countOfCaseAllocated: String(detail.countOfCaseAllocated),
        collectionManagerName: detail.collectionManagerName,
        collectionManagerLocation: detail.collectionManagerLocation,
        cmSign: detail.cmSign,
      }))
    };
  } catch (error) {
    console.error("Error fetching Product Declaration:", error);
    return null;
  }
}

export async function deleteProductDeclarationAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: you must be logged in" };
  }

  try {
    const form = await prisma.productDeclaration.findFirst({
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

    await prisma.productDeclaration.delete({
      where: { id: id }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/forms/productDeclaration`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Product Declaration:", error);
    return { error: "An unknown error occurred while deleting the form" };
  }
}