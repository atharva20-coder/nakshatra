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
    createdAt: Date;
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
      
      const submissions: { id: string; status: SubmissionStatus; createdAt: Date; updatedAt: Date }[] = await prismaModel.findMany({
        where: { [userRelationField]: userId },
        select: { id: true, status: true, createdAt: true, updatedAt: true },
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
 * Fetches paginated user list with submission counts for admin
 */
export async function getUsersWithSubmissionStats(
  page: number = 1,
  pageSize: number = 50,
  searchQuery?: string,
  month?: number,
  year?: number
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden", users: [], totalCount: 0, totalPages: 0 };
  }

  try {
    const skip = (page - 1) * pageSize;
    
    const whereClause = searchQuery
      ? {
          name: {
            contains: searchQuery,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: { id: true, name: true, email: true },
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { error: "Failed to fetch users.", users: [], totalCount: 0, totalPages: 0 };
  }
}

/**
 * Fetches form status summary for a specific user and month
 */
export async function getUserFormStatus(userId: string, month?: number, year?: number) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden", formStatuses: {} };
  }

  try {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();
    
    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const formStatuses: Record<string, {
      status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'OVERDUE';
      formId?: string;
      lastUpdated?: Date;
    }> = {};

    await Promise.all(
      (Object.keys(FORM_CONFIGS) as FormType[]).map(async (formType) => {
        const config = FORM_CONFIGS[formType];
        if (!config.isRequired) return;

        const modelName = config.id as keyof typeof prisma;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaModel = (prisma as any)[modelName];
        if (!prismaModel) return;

        const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
        
        // Find submissions for this form type in the target month
        const submission = await prismaModel.findFirst({
          where: {
            [userRelationField]: userId,
            updatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { id: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        });

        const deadline = new Date(targetYear, targetMonth - 1, config.deadlineDay, 23, 59, 59);
        const isOverdue = now > deadline;

        if (!submission) {
          formStatuses[formType] = {
            status: isOverdue ? 'OVERDUE' : 'NOT_STARTED'
          };
        } else if (submission.status === SubmissionStatus.SUBMITTED) {
          formStatuses[formType] = {
            status: 'SUBMITTED',
            formId: submission.id,
            lastUpdated: submission.updatedAt,
          };
        } else if (submission.status === SubmissionStatus.DRAFT) {
          formStatuses[formType] = {
            status: isOverdue ? 'OVERDUE' : 'DRAFT',
            formId: submission.id,
            lastUpdated: submission.updatedAt,
          };
        }
      })
    );

    return { formStatuses, error: null };
  } catch (error) {
    console.error(`Error fetching form status for user ${userId}:`, error);
    return { error: "Failed to fetch form status.", formStatuses: {} };
  }
}

/**
 * Fetches all form submissions and all users for the admin forms page.
 * DEPRECATED: Use getUsersWithSubmissionStats and getUserFormStatus instead for better performance
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
                select: { id: true, status: true, createdAt: true, updatedAt: true },
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