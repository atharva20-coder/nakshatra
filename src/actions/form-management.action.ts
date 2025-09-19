"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { FORM_CONFIGS, FormType } from "@/types/forms";

interface FormSubmissionSummary {
    id: string;
    status: SubmissionStatus;
    updatedAt: Date;
    formType: string;
}

/**
 * Fetches all form submissions for the currently logged-in user across all form types.
 * Used for the main user dashboard.
 */
export async function getFormSubmissionsAction(): Promise<{ submissions?: FormSubmissionSummary[], error?: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;

  try {
    const formPromises = (Object.keys(FORM_CONFIGS) as FormType[]).map(async (formType) => {
      const modelName = FORM_CONFIGS[formType].id as keyof typeof prisma;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaModel = (prisma as any)[modelName];
      if (!prismaModel) return [];
      
      const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
      
      const submissions: { id: string; status: SubmissionStatus; updatedAt: Date }[] = await prismaModel.findMany({
        where: { [userRelationField]: userId },
        select: { id: true, status: true, updatedAt: true },
      });
      
      return submissions.map((s) => ({ ...s, formType }));
    });

    const allSubmissionsArrays = await Promise.all(formPromises);
    const allSubmissions = allSubmissionsArrays.flat();

    allSubmissions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return { submissions: allSubmissions };
  } catch (error) {
      console.error("Error fetching form submissions:", error);
      return { error: "Could not fetch form submissions." };
  }
}

/**
 * Fetches all form submissions and all users for the admin forms page.
 */
export async function getAllSubmissionsForAdmin() {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || session.user.role !== UserRole.ADMIN) {
        return { error: "Forbidden", submissions: null, users: null };
    }

    try {
        const formPromises = (Object.keys(FORM_CONFIGS) as FormType[]).map(async (formType) => {
            const modelName = FORM_CONFIGS[formType].id as keyof typeof prisma;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prismaModel = (prisma as any)[modelName];
            if (!prismaModel) return [];

            const userRelationField = formType === 'agencyVisits' ? 'agency' : 'user';

            const submissions = await prismaModel.findMany({
                include: { [userRelationField]: { select: { id: true, name: true } } },
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return submissions.map((sub: any) => ({
                ...sub,
                formType,
                user: sub[userRelationField],
            }));
        });

        const allSubmissionsArrays = await Promise.all(formPromises);
        const allSubmissions = allSubmissionsArrays.flat();
        
        const users = await prisma.user.findMany({ select: { id: true, name: true } });

        return { submissions: allSubmissions, users, error: null };
    } catch (error) {
        console.error("Error fetching admin submissions:", error);
        return { error: "Failed to fetch submissions.", submissions: [], users: [] };
    }
}

/**
 * Fetches all submissions for a specific user. (Admin only)
 */
export async function getSubmissionsForUser(userId: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || session.user.role !== UserRole.ADMIN) {
        return { error: "Forbidden", submissions: null };
    }
    
    try {
        const formPromises = (Object.keys(FORM_CONFIGS) as FormType[]).map(async (formType) => {
            const modelName = FORM_CONFIGS[formType].id as keyof typeof prisma;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prismaModel = (prisma as any)[modelName];
            if (!prismaModel) return [];

            const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
            
            const submissions = await prismaModel.findMany({
                where: { [userRelationField]: userId },
                select: { id: true, status: true, updatedAt: true },
            });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return submissions.map((s: any) => ({ ...s, formType }));
        });

        const allSubmissionsArrays = await Promise.all(formPromises);
        const allSubmissions = allSubmissionsArrays.flat();

        allSubmissions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return { submissions: allSubmissions, error: null };
    } catch (error) {
        console.error(`Error fetching submissions for user ${userId}:`, error);
        return { error: "Failed to fetch submissions.", submissions: [] };
    }
}