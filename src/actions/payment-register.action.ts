"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { PaymentRegisterRow } from "@/types/forms";

type PaymentRegisterInput = Omit<PaymentRegisterRow, 'id'>;

export async function savePaymentRegisterAction(
  rows: PaymentRegisterInput[],
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
            receiptAmount: parseFloat(row.receiptAmount) || 0,
            depositionDate: new Date(row.depositionDate),
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.paymentRegister.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.paymentRegister.update({ where: { id: formId }, data });
    } else {
      await prisma.paymentRegister.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/paymentRegister/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Payment Register:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
