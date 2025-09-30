"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { PenaltyMatrixRow } from "@/types/forms";

type PenaltyMatrixInput = Omit<PenaltyMatrixRow, 'id'>;

export async function savePenaltyMatrixAction(
  rows: PenaltyMatrixInput[],
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

    const data = {
      status: submissionStatus,
      details: {
        deleteMany: {},
        create: rows.map(row => ({
            ...row,
            penaltyAmount: parseFloat(row.penaltyAmount) || 0,
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.agencyPenaltyMatrix.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.agencyPenaltyMatrix.update({ where: { id: formId }, data });
    } else {
      await prisma.agencyPenaltyMatrix.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/penaltyMatrix/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Penalty Matrix:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
