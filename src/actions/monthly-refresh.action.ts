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
  const userField = formType === "agencyVisits" ? "agencyId" : "userId";

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
    const userField = formType === "agencyVisits" ? "agencyId" : "userId";

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
 */
export async function markOverdueFormsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session && !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" };
  }

  try {
    const now = new Date();
    const users: Pick<User, "id" | "name" | "email" | "createdAt">[] =
      await prisma.user.findMany({
        where: { role: "USER" },
        select: { id: true, name: true, email: true, createdAt: true },
      });

    let totalOverdue = 0;
    const overdueDetails: Array<{ userId: string; formType: string; userName: string }> = [];

    for (const user of users) {
      for (const [formType, config] of Object.entries(FORM_CONFIGS) as [
        FormType,
        (typeof FORM_CONFIGS)[FormType]
      ][]) {
        if (!config.isRequired) continue;

        const model = getPrismaDelegate(formType);
        const userField = formType === "agencyVisits" ? "agencyId" : "userId";

        const latestForm = await model.findFirst({
          where: { [userField]: user.id },
          orderBy: { createdAt: "desc" },
        } as object);

        const validity =
          latestForm &&
          getFormValidityPeriod(
            latestForm.createdAt,
            config.category as "monthly" | "annual",
            config.deadlineDay
          );

        const isOverdueNow =
          !latestForm ||
          isFormOverdue(latestForm.status, validity!.end, now);

        if (isOverdueNow) {
          totalOverdue++;
          overdueDetails.push({ userId: user.id, formType, userName: user.name });

          await createNotificationAction(
            user.id,
            NotificationType.SYSTEM_ALERT,
            "Form Overdue",
            `Your ${config.title} form is overdue. Please submit it as soon as possible.`,
            `/user/forms/${formType}`,
            latestForm?.id,
            "form"
          );

          if (latestForm) {
            await logFormActivityAction({
              action: ActivityAction.FORM_CREATED,
              entityType: formType,
              description: `Form marked as overdue`,
              entityId: latestForm.id,
              metadata: {
                status: "OVERDUE",
                validityEnd: validity!.end.toISOString(),
                currentStatus: latestForm.status,
              },
            });
          }
        }
      }
    }

    return { success: true, totalOverdue, overdueDetails };
  } catch (error) {
    console.error("Error marking overdue forms:", error);
    return { error: "Failed to mark overdue forms" };
  }
}

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
    const userField = formType === "agencyVisits" ? "agencyId" : "userId";
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
