"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ProactiveEscalationRow } from "@/types/forms";

type ProactiveEscalationInput = Omit<ProactiveEscalationRow, 'id'>;

export async function saveProactiveEscalationAction(
  rows: ProactiveEscalationInput[],
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
            dateOfContact: new Date(row.dateOfContact),
            dateOfTrailUploaded: row.dateOfTrailUploaded ? new Date(row.dateOfTrailUploaded) : null,
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.proactiveEscalationTracker.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.proactiveEscalationTracker.update({ where: { id: formId }, data });
    } else {
      await prisma.proactiveEscalationTracker.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/proactiveEscalation/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Proactive Escalation:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
