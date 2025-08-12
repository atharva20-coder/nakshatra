"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { DeclarationManagerRow } from "@/types/forms";

type DeclarationManagerInput = Omit<DeclarationManagerRow, 'id'>;

export async function saveDeclarationCumUndertakingAction(
  rows: DeclarationManagerInput[],
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

    // Map the frontend field names to the Prisma schema field names.
    const collectionManagersData = rows.map(row => ({
      name: row.collectionManagerName,
      employeeId: row.collectionManagerEmployeeId,
      signature: row.collectionManagerSignature,
    }));

    const data = {
      status: submissionStatus,
      collectionManagers: {
        deleteMany: {},
        create: collectionManagersData, // Use the correctly mapped data
      },
    };

    if (formId) {
      const existingForm = await prisma.declarationCumUndertaking.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.declarationCumUndertaking.update({ where: { id: formId }, data });
    } else {
      await prisma.declarationCumUndertaking.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/declarationCumUndertaking/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Declaration Cum Undertaking:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
