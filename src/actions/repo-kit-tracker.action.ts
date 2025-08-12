"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { RepoKitTrackerRow } from "@/types/forms";

type RepoKitTrackerInput = Omit<RepoKitTrackerRow, 'id'>;

export async function saveRepoKitTrackerAction(
  rows: RepoKitTrackerInput[],
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
            issueDateFromBank: new Date(row.issueDateFromBank),
            dateOfReturnToCo: row.dateOfReturnToCo ? new Date(row.dateOfReturnToCo) : null,
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.repoKitTracker.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.repoKitTracker.update({ where: { id: formId }, data });
    } else {
      await prisma.repoKitTracker.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/repoKitTracker/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Repo Kit Tracker:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
