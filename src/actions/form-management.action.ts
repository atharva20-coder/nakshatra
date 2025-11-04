/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { z } from "zod";

interface FormSubmissionSummary {
    id: string;
    status: SubmissionStatus;
    updatedAt: Date;
    createdAt: Date;
    formType: string;
}

// Define the User type returned by this specific function
type UserBasic = {
  id: string;
  name: string;
  email: string;
};

// Define the function's return type
type GetUsersResponse = {
  users: UserBasic[];
  totalCount: number;
  error?: string;
};

// --- Zod Schema for Validation (FIX: Added missing definition) ---

// Schema to validate all inputs passed from the client
const GetUsersSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1."),
  pageSize: z
    .number()
    .int()
    .min(1, "Page size must be at least 1.")
    .max(100, "Page size cannot exceed 100."), // Good practice to cap page size
  searchQuery: z.string(),
  month: z.number().int().min(1).max(12), // Not used in this query, but passed by client
  year: z.number().int().min(2020), // Not used in this query, but passed by client
  role: z.nativeEnum(UserRole).refine(() => true, { message: "Invalid role." }),
});

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
      const config = FORM_CONFIGS[formType];
      const modelName = (config as { id: keyof typeof prisma }).id;
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
  page: number,
  pageSize: number,
  searchQuery: string,
  month: number, // Param is unused here but required by the call signature
  year: number, // Param is unused here but required by the call signature
  role: UserRole
): Promise<GetUsersResponse> {
  
  // 1. Validate Inputs
  const validation = GetUsersSchema.safeParse({
    page,
    pageSize,
    searchQuery,
    month,
    year,
    role,
  });

  if (!validation.success) {
    // Log the detailed error for debugging
    console.error("Invalid input for getUsersWithSubmissionStats:", validation.error.format());
    return {
      users: [],
      totalCount: 0,
      error: "Invalid input. Please check your filters.",
    };
  }
  
  const { data } = validation;

  // 2. Security: Authenticate and Authorize
  // The 'auth' function comes from your NextAuth setup (e.g., /lib/auth.ts)
  // The error "This expression is not callable" suggests an issue with your auth.ts file or the import
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return { users: [], totalCount: 0, error: "Unauthorized." };
  }

  // 3. Build Prisma Where Clause
  const whereClause: any = {
    role: data.role,
  };

  // Add search query if it's not empty
  if (data.searchQuery) {
    whereClause.OR = [
      { name: { contains: data.searchQuery, mode: "insensitive" } },
      { email: { contains: data.searchQuery, mode: "insensitive" } },
    ];
  }

  // 4. Database Query
  try {
    // Use a $transaction to ensure the count and data are consistent
    const [users, totalCount] = await prisma.$transaction([
      // Query 1: Get the paginated users
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
        },
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
        orderBy: {
          name: "asc", // Or createdAt: 'desc'
        },
      }),
      // Query 2: Get the total count matching the filters
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    return { users, totalCount };
  } catch (err) { // FIX: Removed the typo "_" from "catch (err)_ {"
    console.error("Failed to fetch users:", err);
    return {
      users: [],
      totalCount: 0,
      error: "Database error. Failed to fetch agencies.",
    };
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

        const modelName = (config as { id: keyof typeof prisma }).id;
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
            const modelName = (FORM_CONFIGS[formType] as { id: keyof typeof prisma }).id;
            const prismaModel = (prisma as any)[modelName];
            if (!prismaModel) return [];

            const userRelationField = formType === 'agencyVisits' ? 'agency' : 'user';

            const submissions = await prismaModel.findMany({
                include: { [userRelationField]: { select: { id: true, name: true } } },
            });

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
            const modelName = (FORM_CONFIGS[formType] as { id: keyof typeof prisma }).id;
            const prismaModel = (prisma as any)[modelName];
            if (!prismaModel) return [];

            const userRelationField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
            
            const submissions = await prismaModel.findMany({
                where: { [userRelationField]: userId },
                select: { id: true, status: true, createdAt: true, updatedAt: true },
            });
            
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