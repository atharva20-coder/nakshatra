"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { FORM_CONFIGS, FormType } from "@/types/forms";

/**
 * Checks if a user needs form refresh and creates new submission tracking
 * Called on dashboard load and scheduled via cron job
 */
export async function checkAndRefreshFormsAction(userId?: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return { error: "Unauthorized" };
  }

  const targetUserId = userId || session.user.id;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { createdAt: true }
    });

    if (!user) {
      return { error: "User not found" };
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Check if it's past the 5th of the month
    if (currentDay < 5) {
      return { success: true, refreshed: false, message: "Not yet refresh day" };
    }

    // Get user's registration date
    const registrationDate = new Date(user.createdAt);
    const registrationMonth = registrationDate.getMonth() + 1;
    const registrationYear = registrationDate.getFullYear();

    // Check if user registered this month (don't create overdue forms)
    const isNewUser = registrationYear === currentYear && registrationMonth === currentMonth;

    // Check for forms that need refresh
    const formsToCheck = Object.entries(FORM_CONFIGS).filter(([_, config]) => 
      config.category === 'monthly' || config.category === 'annual'
    );

    let refreshedCount = 0;

    for (const [formType, config] of formsToCheck) {
      // Skip if user registered after the form was due
      if (isNewUser && config.isRequired) {
        continue;
      }

      // For annual forms, check if it's April (start of Indian financial year)
      if (config.category === 'annual' && currentMonth !== 4) {
        continue;
      }

      // Get the latest submission for this form
      const tableName = getTableNameForForm(formType as FormType);
      const userField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latestSubmission = await (prisma as any)[tableName].findFirst({
        where: { [userField]: targetUserId },
        orderBy: { updatedAt: 'desc' }
      });

      // Check if last submission was in previous month/year
      if (latestSubmission) {
        const lastUpdate = new Date(latestSubmission.updatedAt);
        const lastMonth = lastUpdate.getMonth() + 1;
        const lastYear = lastUpdate.getFullYear();

        // For monthly forms
        if (config.category === 'monthly') {
          // If last update was this month, no need to refresh
          if (lastMonth === currentMonth && lastYear === currentYear) {
            continue;
          }

          // If form is not submitted, don't create new entry
          if (latestSubmission.status !== SubmissionStatus.SUBMITTED) {
            continue;
          }
        }

        // For annual forms
        if (config.category === 'annual') {
          // Check if last update was this financial year
          const lastFinancialYear = lastMonth >= 4 ? lastYear : lastYear - 1;
          const currentFinancialYear = currentMonth >= 4 ? currentYear : currentYear - 1;
          
          if (lastFinancialYear === currentFinancialYear) {
            continue;
          }

          // If form is not submitted, don't create new entry
          if (latestSubmission.status !== SubmissionStatus.SUBMITTED) {
            continue;
          }
        }
      }

      // Create new draft entry for the form
      // Note: Actual implementation would create empty form entries
      // This is a placeholder for the logic
      refreshedCount++;
    }

    return { 
      success: true, 
      refreshed: refreshedCount > 0, 
      count: refreshedCount 
    };
  } catch (error) {
    console.error("Error refreshing forms:", error);
    return { error: "Failed to refresh forms" };
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
 * Get form submission history for a user
 */
export async function getFormHistoryAction(userId: string, formType: FormType) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const tableName = getTableNameForForm(formType);
    const userField = formType === 'agencyVisits' ? 'agencyId' : 'userId';
    const includeField = getIncludeFieldForForm(formType);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissions = await (prisma as any)[tableName].findMany({
      where: { 
        [userField]: userId,
        status: SubmissionStatus.SUBMITTED 
      },
      orderBy: { createdAt: 'desc' },
      include: includeField ? { [includeField]: true } : {}
    });

    return { success: true, submissions };
  } catch (error) {
    console.error("Error fetching form history:", error);
    return { error: "Failed to fetch form history" };
  }
}

/**
 * Helper to get the correct include field name for each form type
 */
function getIncludeFieldForForm(formType: FormType): string | null {
  const includeMapping: Record<FormType, string | null> = {
    codeOfConduct: 'details',
    declarationCumUndertaking: 'collectionManagers',
    agencyVisits: 'details',
    monthlyCompliance: 'details',
    assetManagement: 'details',
    telephoneDeclaration: 'details',
    manpowerRegister: 'details',
    productDeclaration: 'details',
    penaltyMatrix: 'details',
    trainingTracker: 'details',
    proactiveEscalation: 'details',
    escalationDetails: 'details',
    paymentRegister: 'details',
    repoKitTracker: 'details'
  };
  
  return includeMapping[formType];
}