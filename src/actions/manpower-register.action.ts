"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ManpowerRegisterRow } from "@/types/forms";

type ManpowerRegisterInput = Omit<ManpowerRegisterRow, 'id'>[];

export async function saveManpowerRegisterAction(
  rows: ManpowerRegisterInput,
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
      return { error: "At least one manpower entry is required." };
    }

    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      executiveCategory: row.executiveCategory,
      hhdIdOfFos: row.hhdIdOfFos || null,
      axisIdOfFos: row.axisIdOfFos || null,
      fosFullName: row.fosFullName,
      dateOfJoining: new Date(row.dateOfJoining),
      product: row.product,
      cocSigned: row.cocSigned,
      collectionManagerName: row.collectionManagerName,
      collectionManagerId: row.collectionManagerId,
      collectionManagerSign: row.collectionManagerSign,
      dateOfResignation: row.dateOfResignation ? new Date(row.dateOfResignation) : null,
      idCardsIssuanceDate: row.idCardsIssuanceDate ? new Date(row.idCardsIssuanceDate) : null,
      idCardReturnDate: row.idCardReturnDate ? new Date(row.idCardReturnDate) : null,
      executiveSignature: row.executiveSignature,
      remarks: row.remarks || null,
    }));

    let existingForm = null;
    if (formId) {
      existingForm = await prisma.agencyManpowerRegister.findFirst({
        where: { id: formId, userId: userId },
      });
    } else {
      existingForm = await prisma.agencyManpowerRegister.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
      });
    }

    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot update a submitted form." };
      }

      savedForm = await prisma.agencyManpowerRegister.update({
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
      savedForm = await prisma.agencyManpowerRegister.create({
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
    revalidatePath(`/forms/manpowerRegister`);
    revalidatePath(`/forms/manpowerRegister/${savedForm.id}`);

    return {
      success: true,
      formId: savedForm.id
    };
  } catch (err) {
    console.error("Error saving Manpower Register:", err);
    return { error: "An unknown error occurred while saving the form" };
  }
}

export async function getManpowerRegisterById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null;
  }

  try {
    const form = await prisma.agencyManpowerRegister.findFirst({
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
        executiveCategory: detail.executiveCategory,
        hhdIdOfFos: detail.hhdIdOfFos || "",
        axisIdOfFos: detail.axisIdOfFos || "",
        fosFullName: detail.fosFullName,
        dateOfJoining: new Date(detail.dateOfJoining).toISOString().split('T')[0],
        product: detail.product,
        cocSigned: detail.cocSigned,
        collectionManagerName: detail.collectionManagerName,
        collectionManagerId: detail.collectionManagerId,
        collectionManagerSign: detail.collectionManagerSign,
        dateOfResignation: detail.dateOfResignation ? new Date(detail.dateOfResignation).toISOString().split('T')[0] : "",
        idCardsIssuanceDate: detail.idCardsIssuanceDate ? new Date(detail.idCardsIssuanceDate).toISOString().split('T')[0] : "",
        idCardReturnDate: detail.idCardReturnDate ? new Date(detail.idCardReturnDate).toISOString().split('T')[0] : "",
        executiveSignature: detail.executiveSignature,
        remarks: detail.remarks || "",
      }))
    };
  } catch (error) {
    console.error("Error fetching Manpower Register:", error);
    return null;
  }
}

export async function deleteManpowerRegisterAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: you must be logged in" };
  }

  try {
    const form = await prisma.agencyManpowerRegister.findFirst({
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

    await prisma.agencyManpowerRegister.delete({
      where: { id: id }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/forms/manpowerRegister`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Manpower Register:", error);
    return { error: "An unknown error occurred while deleting the form" };
  }
}