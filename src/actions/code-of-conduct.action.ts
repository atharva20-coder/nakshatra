"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CodeOfConductRow } from "@/types/forms";

// Input type for multiple rows
type CodeOfConductInput = Omit<CodeOfConductRow, 'id'>[];

export async function saveCodeOfConductAction(
  rows: CodeOfConductInput,
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
      return { error: "At least one row is required." };
    }

    // Validate all rows
    const invalidRow = rows.find(row => 
      !row.name.trim() || !row.signature.trim() || !row.date.trim()
    );
    
    if (invalidRow) {
      return { error: "Please fill in all required fields for each row." };
    }

    if (formId) {
      // Check if user owns this form
      const existingForm = await prisma.codeOfConduct.findFirst({
        where: { id: formId, userId: userId },
        include: { details: true }
      });
      
      if (!existingForm) {
        return { error: "Forbidden: You do not have permission to edit this form." };
      }

      // Don't allow editing if already submitted
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot edit a submitted form." };
      }

      // Update form with new rows
      await prisma.codeOfConduct.update({
        where: { id: formId },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: rows.map(row => ({
              name: row.name.trim(),
              signature: row.signature.trim(),
              date: new Date(row.date)
            }))
          }
        }
      });
    } else {
      // Create new form with rows
      await prisma.codeOfConduct.create({
        data: {
          userId,
          status: submissionStatus,
          details: {
            create: rows.map(row => ({
              name: row.name.trim(),
              signature: row.signature.trim(),
              date: new Date(row.date)
            }))
          }
        }
      });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/codeOfConduct/${formId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Error saving Code of Conduct:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function getCodeOfConductById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return null;
  }

  try {
    const form = await prisma.codeOfConduct.findFirst({
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

    // Convert to the expected format
    return {
      id: form.id,
      status: form.status,
      details: form.details.map(detail => ({
        id: detail.id,
        name: detail.name,
        signature: detail.signature,
        date: detail.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
      }))
    };
  } catch (error) {
    console.error("Error fetching Code of Conduct:", error);
    return null;
  }
}

export async function deleteCodeOfConductAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.codeOfConduct.findFirst({
      where: { id, userId: session.user.id }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    await prisma.codeOfConduct.delete({
      where: { id }
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Code of Conduct:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}