"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { PaymentRegisterRow } from "@/types/forms";

type PaymentRegisterInput = Omit<PaymentRegisterRow, 'id'>[];

export async function savePaymentRegisterAction(
  rows: PaymentRegisterInput,
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
      return { error: "At least one payment entry is required." };
    }

    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      month: row.month,
      eReceiptNo: row.eReceiptNo,
      accountNo: row.accountNo,
      customerName: row.customerName,
      receiptAmount: parseFloat(row.receiptAmount) || 0,
      modeOfPayment: row.modeOfPayment,
      depositionDate: new Date(row.depositionDate),
      fosHhdId: row.fosHhdId,
      fosName: row.fosName,
      fosSign: row.fosSign,
      cmName: row.cmName,
      cmVerificationStatus: row.cmVerificationStatus,
      remarks: row.remarks || null,
    }));

    let existingForm = null;
    if (formId) {
      existingForm = await prisma.paymentRegister.findFirst({
        where: { id: formId, userId: userId },
      });
    } else {
      existingForm = await prisma.paymentRegister.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
      });
    }

    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot update a submitted form." };
      }

      savedForm = await prisma.paymentRegister.update({
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
      savedForm = await prisma.paymentRegister.create({
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
    revalidatePath(`/forms/paymentRegister`);
    revalidatePath(`/forms/paymentRegister/${savedForm.id}`);

    return {
      success: true,
      formId: savedForm.id
    };
  } catch (err) {
    console.error("Error saving Payment Register:", err);
    return { error: "An unknown error occurred while saving the form" };
  }
}

export async function getPaymentRegisterById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null;
  }

  try {
    const form = await prisma.paymentRegister.findFirst({
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
        month: detail.month,
        eReceiptNo: detail.eReceiptNo,
        accountNo: detail.accountNo,
        customerName: detail.customerName,
        receiptAmount: String(detail.receiptAmount),
        modeOfPayment: detail.modeOfPayment,
        depositionDate: new Date(detail.depositionDate).toISOString().split('T')[0],
        fosHhdId: detail.fosHhdId,
        fosName: detail.fosName,
        fosSign: detail.fosSign,
        cmName: detail.cmName,
        cmVerificationStatus: detail.cmVerificationStatus,
        remarks: detail.remarks || "",
      }))
    };
  } catch (error) {
    console.error("Error fetching Payment Register:", error);
    return null;
  }
}

export async function deletePaymentRegisterAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: you must be logged in" };
  }

  try {
    const form = await prisma.paymentRegister.findFirst({
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

    await prisma.paymentRegister.delete({
      where: { id: id }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/forms/paymentRegister`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Payment Register:", error);
    return { error: "An unknown error occurred while deleting the form" };
  }
}