"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { FORM_CONFIGS, FormType } from "@/types/forms";

// Using `unknown` is a safer alternative to `any` for generic object types.
type AnyFormRow = Record<string, unknown> & { id: number | string };

export async function saveOrSubmitFormAction(
  formType: FormType,
  rows: AnyFormRow[],
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
    
    const modelName = FORM_CONFIGS[formType].id as keyof typeof prisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[modelName];

    if (!prismaModel) {
        return { error: "Invalid form type" };
    }

    const data = {
      status: submissionStatus,
      details: {
        deleteMany: {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        create: rows.map(({ id, ...row }) => row),
      },
    };

    const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';

    if (formId) {
      const existingForm = await prismaModel.findFirst({ where: { id: formId, [userRelationField]: userId } });
      if (!existingForm) return { error: "Forbidden" };
      await prismaModel.update({ where: { id: formId }, data });
    } else {
      await prismaModel.create({ data: { ...data, [userRelationField]: userId } });
    }

    revalidatePath("/dashboard");
    if (formId) revalidatePath(`/forms/${formType}/${formId}`);
    return { success: true };

  } catch (err) {
    console.error(`Error saving form [${formType}]:`, err);
    return { error: "An unknown error occurred while saving the form." };
  }
}

// Define a more specific type for the submission objects
interface FormSubmissionSummary {
    id: string;
    status: SubmissionStatus;
    updatedAt: Date;
    formType: string;
}

/**
 * Fetches all form submissions for the currently logged-in user across all form types.
 */
export async function getFormSubmissionsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;

  const formPromises = Object.keys(FORM_CONFIGS).map(async (formType) => {
    const modelName = FORM_CONFIGS[formType as FormType].id as keyof typeof prisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[modelName];
    if (!prismaModel) return [];
    
    const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
    
    const submissions = await prismaModel.findMany({
      where: { [userRelationField]: userId },
      select: { id: true, status: true, updatedAt: true },
    });
    
    return submissions.map((s: FormSubmissionSummary) => ({ ...s, formType }));
  });

  const allSubmissionsArrays = await Promise.all(formPromises);
  const allSubmissions = allSubmissionsArrays.flat();

  allSubmissions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return { submissions: allSubmissions };
}

/**
 * Fetches a single form submission by its ID and type, ensuring the user has permission.
 */
export async function getFormSubmissionByIdAction(formType: FormType, id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return null;
  
  const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
  const modelName = FORM_CONFIGS[formType].id as keyof typeof prisma;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (prisma as any)[modelName];

  if (!prismaModel) return null;

  return prismaModel.findFirst({
    where: { id, [userRelationField]: session.user.id },
    include: { details: true },
  });
}

/**
 * Fetches all submitted forms for approval. Restricted to admins and auditors.
 */
export async function getApprovalRequestsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.AUDITOR)) {
    return { error: "Forbidden" };
  }

  const requests = await prisma.approvalRequest.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return { requests };
}
