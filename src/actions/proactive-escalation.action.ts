"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ProactiveEscalationRow } from "@/types/forms";

type ProactiveEscalationInput = Omit<ProactiveEscalationRow, 'id'>[];

export async function saveProactiveEscalationAction(
  rows: ProactiveEscalationInput,
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
      return { error: "At least one escalation entry is required." };
    }

    const detailsToCreate = rows.map(row => ({
      lanCardNo: row.lanCardNo,
      customerName: row.customerName,
      product: row.product,
      currentBucket: row.currentBucket,
      dateOfContact: new Date(row.dateOfContact),
      modeOfContact: row.modeOfContact,
      dateOfTrailUploaded: row.dateOfTrailUploaded ? new Date(row.dateOfTrailUploaded) : null,
      listOfCaseWithReasons: row.listOfCaseWithReasons,
      collectionManagerNameId: row.collectionManagerNameId,
    }));

    let existingForm = null;
    if (formId) {
      existingForm = await prisma.proactiveEscalationTracker.findFirst({
        where: { id: formId, userId: userId },
      });
    } else {
      existingForm = await prisma.proactiveEscalationTracker.findFirst({
        where: { userId: userId, status: SubmissionStatus.DRAFT },
      });
    }

    let savedForm;

    if (existingForm) {
      if (existingForm.status === SubmissionStatus.SUBMITTED) {
        return { error: "Cannot update a submitted form." };
      }

      savedForm = await prisma.proactiveEscalationTracker.update({
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
      savedForm = await prisma.proactiveEscalationTracker.create({
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
    revalidatePath(`/forms/proactiveEscalation`);
    revalidatePath(`/forms/proactiveEscalation/${savedForm.id}`);

    return {
      success: true,
      formId: savedForm.id
    };
  } catch (err) {
    console.error("Error saving Proactive Escalation:", err);
    return { error: "An unknown error occurred while saving the form" };
  }
}

export async function getProactiveEscalationById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return null;
  }

  try {
    const form = await prisma.proactiveEscalationTracker.findFirst({
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
        lanCardNo: detail.lanCardNo,
        customerName: detail.customerName,
        product: detail.product,
        currentBucket: detail.currentBucket,
        dateOfContact: new Date(detail.dateOfContact).toISOString().split('T')[0],
        modeOfContact: detail.modeOfContact,
        dateOfTrailUploaded: detail.dateOfTrailUploaded ? new Date(detail.dateOfTrailUploaded).toISOString().split('T')[0] : "",
        listOfCaseWithReasons: detail.listOfCaseWithReasons,
        collectionManagerNameId: detail.collectionManagerNameId,
      }))
    };
  } catch (error) {
    console.error("Error fetching Proactive Escalation:", error);
    return null;
  }
}

export async function deleteProactiveEscalationAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: you must be logged in" };
  }

  try {
    const form = await prisma.proactiveEscalationTracker.findFirst({
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

    await prisma.proactiveEscalationTracker.delete({
      where: { id: id }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/forms/proactiveEscalation`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Proactive Escalation:", error);
    return { error: "An unknown error occurred while deleting the form" };
  }
}

export async function getProactiveEscalationByIdForAdmin(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    // Admin/Super Admin Check
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
        console.log(`getProactiveEscalationByIdForAdmin: Access denied for user ${session?.user?.id} with role ${session?.user?.role}. Required ADMIN or SUPER_ADMIN.`);
        return null;
    }

    try {
        console.log(`getProactiveEscalationByIdForAdmin: Fetching form ${id} as Admin ${session.user.id}`);
        const form = await prisma.proactiveEscalationTracker.findFirst({
            where: { id: id }, // No userId check for admin
            include: {
                details: true,
                user: { // Include the user (agency) details
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!form) {
            console.log(`getProactiveEscalationByIdForAdmin: Form ${id} not found.`);
            return null;
        }

        console.log(`getProactiveEscalationByIdForAdmin: Form ${id} found. Status: ${form.status}. Agency: ${form.user?.name}`);
        const formattedDetails = form.details.map(detail => ({
            id: detail.id,
            lanCardNo: detail.lanCardNo,
            customerName: detail.customerName,
            product: detail.product,
            currentBucket: detail.currentBucket,
            dateOfContact: new Date(detail.dateOfContact).toISOString().split('T')[0],
            modeOfContact: detail.modeOfContact,
            dateOfTrailUploaded: detail.dateOfTrailUploaded ? new Date(detail.dateOfTrailUploaded).toISOString().split('T')[0] : "",
            listOfCaseWithReasons: detail.listOfCaseWithReasons,
            collectionManagerNameId: detail.collectionManagerNameId,
        }));

        return {
            id: form.id,
            status: form.status,
            // Include agency info in the return object
            agencyInfo: form.user ? { userId: form.user.id, name: form.user.name, email: form.user.email } : undefined,
            details: formattedDetails
        };
    } catch (error) {
        console.error("getProactiveEscalationByIdForAdmin: Error fetching Proactive Escalation:", error);
        return null;
    }
}