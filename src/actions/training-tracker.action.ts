"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { TrainingTrackerRow } from "@/types/forms";

type TrainingTrackerInput = Omit<TrainingTrackerRow, 'id'>;

export async function saveTrainingTrackerAction(
  rows: TrainingTrackerInput[],
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
            dateOfTraining: new Date(row.dateOfTraining),
            noOfAttendees: parseInt(row.noOfAttendees, 10) || 0,
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.agencyTrainingTracker.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.agencyTrainingTracker.update({ where: { id: formId }, data });
    } else {
      await prisma.agencyTrainingTracker.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/trainingTracker/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Training Tracker:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
