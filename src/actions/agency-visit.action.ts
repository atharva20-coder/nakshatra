"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AgencyTableRow } from "@/types/forms";

// A type for the row data, excluding the 'id' which is handled by the hook
type AgencyVisitRowInput = Omit<AgencyTableRow, 'id'>;

/**
 * Saves or submits an Agency Visit form.
 * It ensures that users can only create or update their own forms.
 */
export async function saveAgencyVisitAction(
  rows: AgencyVisitRowInput[],
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
        // First, delete all existing rows for this submission
        deleteMany: {},
        // Then, create the new set of rows
        create: rows,
      },
    };

    if (formId) {
      // Update existing form, but first verify ownership
      const existingForm = await prisma.agencyVisit.findFirst({
        where: { id: formId, agencyId: userId },
      });

      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      
      await prisma.agencyVisit.update({ where: { id: formId }, data });
    } else {
      // Create a new form submission
      await prisma.agencyVisit.create({ data: { ...data, agencyId: userId } });
    }

    // Revalidate paths to ensure data is fresh on the dashboard and form pages
    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/agencyVisits/${formId}`);
    
    return { success: true };

  } catch (err) {
    console.error("Error saving agency visit:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}

/**
 * Fetches a single Agency Visit submission by its ID.
 * Ensures that only the owner of the form can access it.
 */
export async function getAgencyVisitById(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }

    const submission = await prisma.agencyVisit.findFirst({
        where: {
            id,
            agencyId: session.user.id,
        },
        include: {
            details: true,
        },
    });

    return submission;
}
