"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CodeOfConductRow } from "@/types/forms";

// This form is single-entry, so we expect only one row of data.
type CodeOfConductInput = Omit<CodeOfConductRow, 'id'>;

export async function saveCodeOfConductAction(
  formData: CodeOfConductInput,
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
      ...formData,
      date: new Date(formData.date), // Convert date string to Date object
      status: submissionStatus,
      userId: userId,
    };

    if (formId) {
      const existingForm = await prisma.codeOfConduct.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.codeOfConduct.update({ where: { id: formId }, data });
    } else {
      await prisma.codeOfConduct.create({ data });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/codeOfConduct/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Code of Conduct:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
