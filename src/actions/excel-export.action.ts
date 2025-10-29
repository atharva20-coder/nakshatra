"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { FORM_CONFIGS, FormType } from "@/types/forms";

interface ExportData {
  formType: string;
  formTitle: string;
  submissionDate: Date;
  status: string;
  data: Record<string, unknown>;
}

/**
 * Get all submitted forms data for a user to export to Excel
 * Returns data in a format ready for Excel generation on client side
 */
export async function getAgencyExportDataAction(userId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden: Only admins can export data" };
  }

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    if (!user) {
      return { error: "User not found" };
    }

    const exportData: Record<string, ExportData[]> = {};

    // Fetch data from all form types
    for (const [formType, config] of Object.entries(FORM_CONFIGS)) {
      const tableName = getTableNameForForm(formType as FormType);
      const userField = formType === 'agencyVisits' ? 'agencyId' : 'userId';

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submissions = await (prisma as any)[tableName].findMany({
          where: {
            [userField]: userId,
            status: SubmissionStatus.SUBMITTED
          },
          include: {
            details: true
          },
          orderBy: { createdAt: 'desc' }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exportData[formType] = submissions.map((sub: any) => ({
          formType,
          formTitle: config.title,
          submissionDate: sub.createdAt,
          status: sub.status,
          data: {
            id: sub.id,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
            details: sub.details || []
          }
        }));
      } catch (error) {
        console.error(`Error fetching ${formType}:`, error);
        exportData[formType] = [];
      }
    }

    return {
      success: true,
      userData: {
        name: user.name,
        email: user.email,
        registrationDate: user.createdAt
      },
      forms: exportData
    };
  } catch (error) {
    console.error("Error preparing export data:", error);
    return { error: "Failed to prepare export data" };
  }
}

/**
 * Helper to get Prisma table name for form type
 */
function getTableNameForForm(formType: FormType): string {
  const mapping: Record<FormType, string> = {
    codeOfConduct: 'codeOfConduct',
    declarationCumUndertaking: 'declarationCumUndertaking',
    agencyVisits: 'agencyVisit',
    monthlyCompliance: 'monthlyCompliance',
    assetManagement: 'assetManagement',
    telephoneDeclaration: 'telephoneDeclaration',
    manpowerRegister: 'agencyManpowerRegister',
    productDeclaration: 'productDeclaration',
    penaltyMatrix: 'agencyPenaltyMatrix',
    trainingTracker: 'agencyTrainingTracker',
    proactiveEscalation: 'proactiveEscalationTracker',
    escalationDetails: 'escalationDetails',
    paymentRegister: 'paymentRegister',
    repoKitTracker: 'repoKitTracker'
  };
  
  return mapping[formType];
}

/**
 * Get monthly summary statistics for admin dashboard
 */
export async function getMonthlyStatisticsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get all users
    const users = await prisma.user.findMany({
      where: { role: { in: [UserRole.USER, UserRole.COLLECTION_MANAGER] } },
      select: { id: true, name: true, createdAt: true }
    });

    const statistics = [];

    for (const user of users) {
      const userStats = {
        userId: user.id,
        userName: user.name,
        totalForms: 0,
        submittedForms: 0,
        draftForms: 0,
        overdueForms: 0
      };

      for (const [formType, config] of Object.entries(FORM_CONFIGS)) {
        if (!config.isRequired) continue;

        const tableName = getTableNameForForm(formType as FormType);
        const userField = formType === 'agencyVisits' ? 'agencyId' : 'userId';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = await (prisma as any)[tableName].findFirst({
          where: { [userField]: user.id },
          orderBy: { updatedAt: 'desc' }
        });

        userStats.totalForms++;

        if (!form) {
          // Check if user was registered before this form was due
          const userRegDate = new Date(user.createdAt);
          const formDeadline = new Date(currentYear, currentMonth - 1, config.deadlineDay);
          
          if (userRegDate < formDeadline) {
            userStats.overdueForms++;
          }
        } else if (form.status === SubmissionStatus.SUBMITTED) {
          userStats.submittedForms++;
        } else if (form.status === SubmissionStatus.DRAFT) {
          userStats.draftForms++;
          
          // Check if draft is overdue
          const formDeadline = new Date(currentYear, currentMonth - 1, config.deadlineDay);
          if (now > formDeadline) {
            userStats.overdueForms++;
          }
        }
      }

      statistics.push(userStats);
    }

    return { success: true, statistics };
  } catch (error) {
    console.error("Error fetching monthly statistics:", error);
    return { error: "Failed to fetch statistics" };
  }
}