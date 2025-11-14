"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus, ActivityAction, NotificationType, User } from "@/generated/prisma";
import { headers } from "next/headers";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";

// --------------------------------------
// Prisma Model Delegate Mapping
// --------------------------------------

const prismaModelMap: Record<FormType, keyof typeof prisma> = {
  codeOfConduct: "codeOfConduct",
  declarationCumUndertaking: "declarationCumUndertaking",
  agencyVisits: "agencyVisit",
  monthlyCompliance: "monthlyCompliance",
  assetManagement: "assetManagement",
  telephoneDeclaration: "telephoneDeclaration",
  manpowerRegister: "agencyManpowerRegister",
  productDeclaration: "productDeclaration",
  penaltyMatrix: "agencyPenaltyMatrix",
  trainingTracker: "agencyTrainingTracker",
  proactiveEscalation: "proactiveEscalationTracker",
  escalationDetails: "escalationDetails",
  paymentRegister: "paymentRegister",
  repoKitTracker: "repoKitTracker",
  noDuesDeclaration:'noDuesDeclaration',
};

/** Safely get a typed Prisma delegate for a given FormType */
function getPrismaDelegate<T extends FormType>(formType: T) {
  const modelName = prismaModelMap[formType];
  return prisma[modelName as keyof typeof prisma] as {
    findFirst: (args: unknown) => Promise<{
      id: string;
      createdAt: Date;
      updatedAt: Date;
      status: SubmissionStatus;
    } | null>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
}

// --------------------------------------
// Interfaces and Helpers
// --------------------------------------

interface FormStatus {
  formType: FormType;
  lastSubmission: Date | null;
  status: SubmissionStatus | null;
  isOverdue: boolean;
  needsRefresh: boolean;
  validityPeriod: { start: Date; end: Date };
}

/**
 * Calculate the validity period for a form based on creation date
 */
function getFormValidityPeriod(
  createdAt: Date,
  category: "monthly" | "annual",
  deadlineDay: number
): { start: Date; end: Date } {
  const createMonth = createdAt.getMonth(); // 0-11
  const createYear = createdAt.getFullYear();

  if (category === "annual") {
    const fyStartMonth = 3; // April
    const fyYear = createMonth >= fyStartMonth ? createYear : createYear - 1;

    return {
      start: new Date(fyYear, fyStartMonth, 1),
      end: new Date(fyYear + 1, fyStartMonth, deadlineDay, 23, 59, 59),
    };
  }

  // Monthly forms
  const nextMonth = createMonth + 1;
  const nextMonthYear = nextMonth > 11 ? createYear + 1 : createYear;
  const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

  return {
    start: new Date(createYear, createMonth, 1),
    end: new Date(nextMonthYear, adjustedMonth, deadlineDay, 23, 59, 59),
  };
}

/**
 * Check if a form is overdue
 */
function isFormOverdue(
  status: SubmissionStatus | null,
  validityEnd: Date,
  now: Date
): boolean {
  if (status === SubmissionStatus.SUBMITTED) return false;
  return now > validityEnd;
}

/**
 * Determine if a form needs refresh
 */
async function shouldRefreshForm(
  userId: string,
  formType: FormType,
  config: typeof FORM_CONFIGS[FormType],
  now: Date
): Promise<{ shouldRefresh: boolean; reason: string }> {
  const model = getPrismaDelegate(formType);
  const userField = ["agencyVisits", "monthlyCompliance", "noDuesDeclaration"].includes(formType)
    ? "agencyId"
    : "userId";

  const latestForm = await model.findFirst({
    where: { [userField]: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      updatedAt: true,
    },
  } as object);

  if (!latestForm) {
    return { shouldRefresh: true, reason: "Initial form creation" };
  }

  const validity = getFormValidityPeriod(
    latestForm.createdAt,
    config.category as "monthly" | "annual",
    config.deadlineDay
  );

  if (now <= validity.end) {
    return { shouldRefresh: false, reason: "Current form still valid" };
  }

  if (latestForm.status !== SubmissionStatus.SUBMITTED) {
    return { shouldRefresh: false, reason: "Previous form not submitted - overdue" };
  }

  if (config.category === "annual") {
    const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const formFY =
      latestForm.createdAt.getMonth() >= 3
        ? latestForm.createdAt.getFullYear()
        : latestForm.createdAt.getFullYear() - 1;

    if (currentFY > formFY) {
      return { shouldRefresh: true, reason: "New financial year - refresh needed" };
    }
  } else {
    return { shouldRefresh: true, reason: "New month - refresh needed" };
  }

  return { shouldRefresh: false, reason: "No refresh needed" };
}

/**
 * Get all forms' status for a user
 */
export async function getUserFormStatusAction(userId: string) {
  const now = new Date();
  const statuses: FormStatus[] = [];

  for (const [formType, config] of Object.entries(FORM_CONFIGS) as [
    FormType,
    (typeof FORM_CONFIGS)[FormType]
  ][]) {
    const model = getPrismaDelegate(formType);
    const userField = ["agencyVisits", "monthlyCompliance", "noDuesDeclaration"].includes(formType)
      ? "agencyId"
      : "userId";

    const latestForm = await model.findFirst({
      where: { [userField]: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        status: true,
        updatedAt: true,
      },
    } as object);

    if (!latestForm) {
      statuses.push({
        formType,
        lastSubmission: null,
        status: null,
        isOverdue: false,
        needsRefresh: true,
        validityPeriod: {
          start: now,
          end: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            config.deadlineDay,
            23,
            59,
            59
          ),
        },
      });
      continue;
    }

    const validity = getFormValidityPeriod(
      latestForm.createdAt,
      config.category as "monthly" | "annual",
      config.deadlineDay
    );
    const overdue = isFormOverdue(latestForm.status, validity.end, now);
    const refreshCheck = await shouldRefreshForm(userId, formType, config, now);

    statuses.push({
      formType,
      lastSubmission:
        latestForm.status === SubmissionStatus.SUBMITTED
          ? latestForm.updatedAt
          : null,
      status: latestForm.status,
      isOverdue: overdue,
      needsRefresh: refreshCheck.shouldRefresh,
      validityPeriod: validity,
    });
  }

  return { success: true, statuses };
}

/**
 * Mark overdue forms (run via cron)
 * NOTE: Penalty Matrix is excluded as it's not a required form
 */
export async function markOverdueFormsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session && !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" };
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    console.log(`⏰ [MARK OVERDUE] Starting at ${now.toISOString()}`);
    console.log(`📅 Current: ${currentYear}-${currentMonth}-${currentDay}`);

    // Only mark as overdue if we're past the 5th of the month
    if (currentDay < 5) {
      console.log(`📅 Day ${currentDay} - forms not yet overdue`);
      return { 
        success: true, 
        totalOverdue: 0, 
        overdueDetails: [],
        message: "Not yet past deadline"
      };
    }

    // Check forms that should have been submitted by 5th of current month
    // These are forms for the PREVIOUS month
    const targetMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const targetYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    console.log(`🔍 Checking ${getMonthName(targetMonth)} ${targetYear} submissions`);

    const users: Pick<User, "id" | "name" | "email" | "createdAt">[] =
      await prisma.user.findMany({
        where: { role: "USER" },
        select: { id: true, name: true, email: true, createdAt: true },
      });

    console.log(`👥 Processing ${users.length} agencies`);

    let totalOverdue = 0;
    const overdueDetails: Array<{ 
      userId: string; 
      formType: string; 
      userName: string;
      formTitle: string;
    }> = [];

    for (const user of users) {
      for (const [formType, config] of Object.entries(FORM_CONFIGS) as [
        FormType,
        (typeof FORM_CONFIGS)[FormType]
      ][]) {
        // Skip non-required forms (like penalty matrix)
        if (!config.isRequired) continue;

        const model = getPrismaDelegate(formType);
        const userField = ["agencyVisits", "monthlyCompliance", "noDuesDeclaration"].includes(formType)
          ? "agencyId"
          : "userId";

        // Check for form in target month
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        const form = await model.findFirst({
          where: {
            [userField]: user.id,
            createdAt: { gte: startDate, lte: endDate }
          },
          select: { id: true, status: true }
        } as object);

        // Mark as overdue if not submitted
        if (!form || form.status !== SubmissionStatus.SUBMITTED) {
          totalOverdue++;
          overdueDetails.push({ 
            userId: user.id, 
            formType, 
            userName: user.name,
            formTitle: config.title
          });

          // Send overdue notification
          await createNotificationAction(
            user.id,
            NotificationType.SYSTEM_ALERT,
            "❌ Form Overdue",
            `${config.title} for ${getMonthName(targetMonth)} ${targetYear} is overdue. Submit immediately to avoid penalties and unlock new forms.`,
            `/user/forms/${formType}`,
            form?.id,
            "form"
          );

          if (form) {
            await logFormActivityAction({
              action: ActivityAction.FORM_CREATED,
              entityType: formType,
              description: `Form marked as overdue`,
              entityId: form.id,
              metadata: {
                status: "OVERDUE",
                targetMonth: getMonthName(targetMonth),
                targetYear,
              },
            });
          }
        }
      }
    }

    console.log(`✅ [MARK OVERDUE] Complete - ${totalOverdue} forms marked`);

    return { 
      success: true, 
      totalOverdue, 
      overdueDetails,
      targetMonth: getMonthName(targetMonth),
      targetYear
    };
  } catch (error) {
    console.error("❌ [MARK OVERDUE] Error:", error);
    return { error: "Failed to mark overdue forms" };
  }
}

// ============================================
// NEW: AUTOMATIC FORM REFRESH FUNCTIONS
// ============================================

/**
 * Refresh forms for eligible agencies (no overdue forms)
 * Called automatically on 5th of each month via cron
 * NOTE: Penalty Matrix is excluded as it's not a required form
 */
export async function refreshEligibleAgencyFormsAction() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Calculate previous month for checking overdue status
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    console.log(`🔄 [AUTO REFRESH] Starting at ${now.toISOString()}`);
    console.log(`📅 New forms for: ${getMonthName(currentMonth)} ${currentYear}`);
    console.log(`📋 Checking: ${getMonthName(prevMonth)} ${prevYear} submissions`);

    // Get all agencies
    const agencies = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, email: true }
    });

    console.log(`👥 Processing ${agencies.length} agencies...`);

    let refreshedCount = 0;
    let skippedCount = 0;
    const details: Array<{
      agencyId: string;
      agencyName: string;
      status: 'refreshed' | 'skipped';
      reason?: string;
      overdueFormsList?: string[];
    }> = [];

    for (const agency of agencies) {
      // Check for overdue forms from previous month
      const overdueCheck = await checkForOverdueForms(
        agency.id,
        prevMonth,
        prevYear
      );

      if (overdueCheck.hasOverdue) {
        // Skip this agency - has overdue forms
        skippedCount++;
        details.push({
          agencyId: agency.id,
          agencyName: agency.name,
          status: 'skipped',
          reason: `Has ${overdueCheck.overdueCount} overdue form(s)`,
          overdueFormsList: overdueCheck.overdueFormsList
        });

        // Notify agency about blocked refresh
        await createNotificationAction(
          agency.id,
          NotificationType.SYSTEM_ALERT,
          "⚠️ New Forms Blocked",
          `New forms for ${getMonthName(currentMonth)} ${currentYear} are not available because you have ${overdueCheck.overdueCount} overdue form(s) from ${getMonthName(prevMonth)} ${prevYear}. Complete these forms first: ${overdueCheck.overdueFormsList.join(", ")}`,
          "/user/dashboard"
        );

        console.log(`⚠️ Skipped ${agency.name} - ${overdueCheck.overdueCount} overdue`);
        continue;
      }

      // Agency is eligible - forms are now available for new month
      refreshedCount++;
      const availableForms = Object.entries(FORM_CONFIGS)
        .filter(([_, config]) => config.isRequired)
        .map(([_, config]) => config.title);

      details.push({
        agencyId: agency.id,
        agencyName: agency.name,
        status: 'refreshed'
      });

      // Notify about new forms availability
      await createNotificationAction(
        agency.id,
        NotificationType.SYSTEM_ALERT,
        "✅ New Forms Available",
        `Forms for ${getMonthName(currentMonth)} ${currentYear} are now available. Submit all required forms before ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05 to avoid penalties.`,
        "/user/dashboard"
      );

      // Log the refresh
      await logFormActivityAction({
        action: ActivityAction.FORM_CREATED,
        entityType: "system",
        description: `Auto-refresh: New forms available for ${agency.name}`,
        metadata: {
          agencyId: agency.id,
          month: String(currentMonth),
          year: String(currentYear),
          previousMonth: prevMonth,
          previousYear: prevYear,
          availableForms
        }
      });

      console.log(`✅ Refreshed for ${agency.name}`);
    }

    console.log(`\n📊 [AUTO REFRESH] Summary:`);
    console.log(`   Total Agencies: ${agencies.length}`);
    console.log(`   ✅ Refreshed: ${refreshedCount}`);
    console.log(`   ⚠️ Skipped: ${skippedCount}`);

    return {
      success: true,
      refreshedAgencies: refreshedCount,
      skippedAgencies: skippedCount,
      totalProcessed: agencies.length,
      currentMonth: getMonthName(currentMonth),
      currentYear,
      details
    };
  } catch (error) {
    console.error("❌ [AUTO REFRESH] Error:", error);
    return { error: "Failed to refresh forms" };
  }
}

/**
 * Check if agency has overdue forms for a specific month
 * NOTE: Only checks REQUIRED forms (penalty matrix excluded)
 */
async function checkForOverdueForms(
  userId: string,
  month: number,
  year: number
): Promise<{
  hasOverdue: boolean;
  overdueCount: number;
  overdueFormsList: string[];
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const overdueFormsList: string[] = [];

  // Check each required form type (penalty matrix excluded)
  for (const [formType, config] of Object.entries(FORM_CONFIGS) as [
    FormType,
    (typeof FORM_CONFIGS)[FormType]
  ][]) {
    // Skip non-required forms
    if (!config.isRequired) continue;

    const model = getPrismaDelegate(formType);
    const userField = ["agencyVisits", "monthlyCompliance", "noDuesDeclaration"].includes(formType)
      ? "agencyId"
      : "userId";

    const form = await model.findFirst({
      where: {
        [userField]: userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { status: true }
    } as object);

    // Form is overdue if: doesn't exist OR not submitted
    if (!form || form.status !== SubmissionStatus.SUBMITTED) {
      overdueFormsList.push(config.title);
    }
  }

  return {
    hasOverdue: overdueFormsList.length > 0,
    overdueCount: overdueFormsList.length,
    overdueFormsList
  };
}

/**
 * Get month name from number (1-12)
 */
function getMonthName(month: number): string {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return names[month - 1] || "";
}

// ============================================
// EXISTING FUNCTIONS (PRESERVED)
// ============================================

/**
 * Manual form refresh
 */
export async function triggerFormRefreshAction(userId?: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) return { error: "Unauthorized" };

  const targetUserId = userId || session.user.id;

  if (
    targetUserId !== session.user.id &&
    !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    return { error: "Forbidden" };
  }

  const statusResult = await getUserFormStatusAction(targetUserId);
  if (!statusResult.success) return { error: "Failed to get form status" };

  return {
    success: true,
    statuses: statusResult.statuses,
    message: "Form status refreshed successfully",
  };
}

/**
 * Fetch submission history
 */
export async function getFormHistoryAction(userId: string, formType: FormType) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) return { error: "Unauthorized" };

  try {
    const model = getPrismaDelegate(formType);
    const userField = ["agencyVisits", "monthlyCompliance", "noDuesDeclaration"].includes(formType)
      ? "agencyId"
      : "userId";
    const includeField = getIncludeFieldForForm(formType);

    const submissions = await model.findMany({
      where: { [userField]: userId, status: SubmissionStatus.SUBMITTED },
      orderBy: { createdAt: "desc" },
      include: includeField ? { [includeField]: true } : {},
    } as object);

    return { success: true, submissions };
  } catch (error) {
    console.error("Error fetching form history:", error);
    return { error: "Failed to fetch form history" };
  }
}

/**
 * Return include field mapping
 */
function getIncludeFieldForForm(formType: FormType): string | null {
  const includeMapping: Partial<Record<FormType, string>> = {
    declarationCumUndertaking: "collectionManagers",
  };
  return includeMapping[formType] ?? "details";
}