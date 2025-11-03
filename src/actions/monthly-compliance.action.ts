"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, NotificationType, SubmissionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logFormActivityAction } from "./activity-logging.action";
import { createNotificationAction } from "./notification.action";
import { handleFormResubmissionAction } from "./approval-request.action";

// Type for the response data coming from the client
export type ComplianceResponseInput = {
  parameterId: string;
  complied: "YES" | "NO" | "NA" | "PENDING";
  remarks: string;
  product: string;
};

// Type for saving/updating the form
export type SaveComplianceData = {
  formId: string;
  month: number;
  year: number;
  responses: ComplianceResponseInput[];
};

/**
 * Fetches or creates a monthly compliance form for the current user.
 * Also fetches all compliance parameters.
 */
export async function getMonthlyComplianceData(month: number, year: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  try {
    // 1. Find or create the MonthlyComplianceForm
    let form = await prisma.monthlyComplianceForm.findUnique({
      where: {
        agencyId_month_year: {
          agencyId: userId,
          month: month,
          year: year,
        },
      },
      include: {
        responses: true, // Include existing responses
        cmSignatures: true, // Include existing signatures
      },
    });

    // If no form exists for this month/year, create one
    if (!form) {
      form = await prisma.monthlyComplianceForm.create({
        data: {
          agencyId: userId,
          month: month,
          year: year,
          status: "DRAFT",
        },
        include: {
          responses: true,
          cmSignatures: true,
        },
      });
    }

    // 2. Fetch all active compliance parameters
    const parameters = await prisma.complianceParameter.findMany({
      where: { isActive: true },
      orderBy: { srNo: "asc" },
    });

    // 3. Fetch the user's profile to get their product list
    const userWithProfile = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cmProfile: {
          select: {
            productsAssigned: true,
          },
        },
      },
    });

    const products = userWithProfile?.cmProfile?.productsAssigned ?? [];

    return {
      success: true,
      form: {
        ...form,
        submittedAt: form.submittedAt?.toISOString() || null,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
      },
      parameters: parameters.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      responses: form.responses.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      signatures: form.cmSignatures.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        signedAt: s.signedAt?.toISOString() || null,
      })),
      products: products,
    };
  } catch (error) {
    console.error("Error getting monthly compliance data:", error);
    return { error: "Failed to load compliance data." };
  }
}

/**
 * Saves or submits the monthly compliance form data
 */
export async function saveMonthlyCompliance(
  data: SaveComplianceData,
  status: "DRAFT" | "SUBMITTED"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { formId, responses, month, year } = data;

  try {
    const currentForm = await prisma.monthlyComplianceForm.findFirst({
      where: { id: formId, agencyId: userId },
    });

    if (!currentForm) {
      return { error: "Form not found or you do not have permission to edit." };
    }

    // Prevent editing if already submitted and not approved for edit
    if (currentForm.status === "SUBMITTED") {
      const approval = await prisma.approvalRequest.findFirst({
        where: {
          formId: formId,
          status: "APPROVED",
          userId: userId,
        },
      });
      if (!approval) {
        return { error: "This form has been submitted and cannot be modified without approval." };
      }
    }

    const submissionStatus = status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
    const wasResubmission = currentForm.status === "SUBMITTED" && submissionStatus === "SUBMITTED";

    await prisma.$transaction(async (tx) => {
      // 1. Upsert all responses
      for (const res of responses) {
        await tx.complianceResponse.upsert({
          where: {
            formId_templateId_product: {
              formId: formId,
              parameterId: res.parameterId,
              product: res.product,
            },
          },
          update: {
            complied: res.complied,
            remarks: res.remarks,
            lastUpdatedBy: userId,
          },
          create: {
            formId: formId,
            parameterId: res.parameterId,
            product: res.product,
            complied: res.complied,
            remarks: res.remarks,
            lastUpdatedBy: userId,
          },
        });
      }

      // 2. Update the main form status
      await tx.monthlyComplianceForm.update({
        where: { id: formId },
        data: {
          status: submissionStatus,
          submittedAt: status === "SUBMITTED" ? new Date() : currentForm.submittedAt,
        },
      });

      // 3. Handle post-submission actions (logging, notifications, clearing approvals)
      const action = wasResubmission ? ActivityAction.FORM_RESUBMITTED : (status === "SUBMITTED" ? ActivityAction.FORM_SUBMITTED : ActivityAction.FORM_UPDATED);
      const description = wasResubmission 
        ? `Resubmitted Monthly Compliance for ${month}/${year}`
        : (status === "SUBMITTED" ? `Submitted Monthly Compliance for ${month}/${year}` : `Saved draft for Monthly Compliance ${month}/${year}`);

      await logFormActivityAction({
        action: action,
        entityType: 'monthlyCompliance',
        description: description,
        entityId: formId,
        metadata: {
          status: submissionStatus,
          month: month,
          year: year,
        }
      });
      
      if (status === "SUBMITTED") {
        if (wasResubmission) {
          await handleFormResubmissionAction(formId, 'monthlyCompliance');
        } else {
           await createNotificationAction(
             userId,
             NotificationType.FORM_SUBMITTED,
             "Form Submitted",
             `Your Monthly Compliance form for ${month}/${year} has been submitted.`,
             `/user/forms/monthlyCompliance/${formId}`,
             formId,
             "form"
           );
        }
      }
    });

    revalidatePath("/user/dashboard");
    revalidatePath(`/user/forms/monthlyCompliance/${formId}`);

    return {
      success: true,
      formId: formId,
      message: status === "DRAFT" ? "Draft saved successfully." : "Form submitted successfully."
    };

  } catch (error) {
    console.error("Error saving Monthly Compliance:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: `Database error: ${error.message}` };
    }
    return { error: "An unknown error occurred while saving." };
  }
}