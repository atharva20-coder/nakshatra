"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { MonthlyComplianceRow } from "@/types/forms";

type MonthlyComplianceInput = Omit<MonthlyComplianceRow, 'id'>;

export async function saveMonthlyComplianceAction(
  rows: MonthlyComplianceInput[],
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
          date: new Date(row.date) // Convert date string to Date object
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.monthlyCompliance.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.monthlyCompliance.update({ where: { id: formId }, data });
    } else {
      await prisma.monthlyCompliance.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/monthlyCompliance/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Monthly Compliance:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
