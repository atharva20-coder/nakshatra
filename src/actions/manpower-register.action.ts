"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ManpowerRegisterRow } from "@/types/forms";

type ManpowerRegisterInput = Omit<ManpowerRegisterRow, 'id'>;

export async function saveManpowerRegisterAction(
  rows: ManpowerRegisterInput[],
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
            dateOfJoining: new Date(row.dateOfJoining),
            dateOfResignation: row.dateOfResignation ? new Date(row.dateOfResignation) : null,
            idCardsIssuanceDate: row.idCardsIssuanceDate ? new Date(row.idCardsIssuanceDate) : null,
            idCardReturnDate: row.idCardReturnDate ? new Date(row.idCardReturnDate) : null,
        })),
      },
    };

    if (formId) {
      const existingForm = await prisma.agencyManpowerRegister.findFirst({
        where: { id: formId, userId: userId },
      });
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }
      await prisma.agencyManpowerRegister.update({ where: { id: formId }, data });
    } else {
      await prisma.agencyManpowerRegister.create({ data: { ...data, userId: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/manpowerRegister/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Manpower Register:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}
