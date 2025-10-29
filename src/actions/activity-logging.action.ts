// src/actions/activity-logging.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from "next/headers";
import { createNotificationAction } from "@/actions/notification.action";

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

function getMonthFromDate(dateString: string): string {
  const month = parseInt(dateString.split('-')[1], 10);
  return MONTH_NAMES[month] || 'Unknown';
}

interface LogActivityParams {
  action: ActivityAction;
  entityType: string;
  description: string;
  entityId?: string;
  metadata?: {
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    month?: string;
    year?: string;
    [key: string]: unknown;
  };
}

export async function logFormActivityAction({
  action,
  entityType,
  description,
  entityId,
  metadata
}: LogActivityParams) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : null;
    const userAgent = headersList.get("user-agent");

    // Extract month/year from metadata or entity creation
    if (metadata?.month && metadata?.year) {
      // Month and year already provided in metadata
    } else if (entityId) {
      // Try to fetch the entity to get its creation date
      const entity = await getEntityCreationDate(entityType, entityId);
      if (entity?.createdAt) {
        const date = entity.createdAt.toISOString().split('T')[0];
        const month = getMonthFromDate(date);
        const year = date.split('-')[0];
        const monthYear = `${month} ${year}`;
        metadata = { ...metadata, month, year, monthYear };
      }
    }

    // Create detailed description with changes
    let detailedDescription = description;
    if (metadata?.oldValues && metadata?.newValues) {
      const changes: string[] = [];
      Object.keys(metadata.newValues).forEach(key => {
        const oldVal = metadata?.oldValues?.[key];
        const newVal = metadata?.newValues?.[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);
        }
      });
      
      if (changes.length > 0) {
        detailedDescription += ` | Changes: ${changes.join(", ")}`;
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action,
        entityType,
        entityId,
        description: detailedDescription,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error logging activity:", error);
    return { error: "Failed to log activity" };
  }
}

async function getEntityCreationDate(entityType: string, entityId: string) {
  const modelMap: Record<string, { findUnique: (args: { where: { id: string }; select: { createdAt: boolean } }) => Promise<{ createdAt: Date } | null> }> = {
    codeOfConduct: prisma.codeOfConduct,
    declarationCumUndertaking: prisma.declarationCumUndertaking,
    agencyVisit: prisma.agencyVisit,
    monthlyCompliance: prisma.monthlyCompliance,
    assetManagement: prisma.assetManagement,
    telephoneDeclaration: prisma.telephoneDeclaration,
    agencyManpowerRegister: prisma.agencyManpowerRegister,
    productDeclaration: prisma.productDeclaration,
    agencyPenaltyMatrix: prisma.agencyPenaltyMatrix,
    agencyTrainingTracker: prisma.agencyTrainingTracker,
    proactiveEscalationTracker: prisma.proactiveEscalationTracker,
    escalationDetails: prisma.escalationDetails,
    paymentRegister: prisma.paymentRegister,
    repoKitTracker: prisma.repoKitTracker,
  };

  const model = modelMap[entityType];
  if (!model) return null;

  try {
    return await model.findUnique({
      where: { id: entityId },
      select: { createdAt: true }
    });
  } catch {
    return null;
  }
}

export async function logFormOverdueAction(
  userId: string,
  formType: string,
  formTitle: string
) {
  try {
    const now = new Date();
    const month = MONTH_NAMES[now.getMonth() + 1];
    const year = now.getFullYear();

    await prisma.activityLog.create({
      data: {
        userId,
        action: ActivityAction.FORM_SUBMITTED, // Using existing enum
        entityType: formType,
        description: `Form ${formTitle} is overdue for ${month} ${year}`,
        metadata: {
          status: 'OVERDUE',
          month,
          year,
          overdueDate: now.toISOString()
        }
      }
    });

    // Create notification
    await createNotificationAction(
      userId,
      NotificationType.SYSTEM_ALERT,
      "Form Overdue",
      `Your ${formTitle} form for ${month} ${year} is overdue. Please submit it as soon as possible.`,
      `/forms/${formType}`,
      undefined,
      "form"
    );

    return { success: true };
  } catch (error) {
    console.error("Error logging overdue form:", error);
    return { error: "Failed to log overdue form" };
  }
}

export async function logMonthlyRefreshAction(
  userId: string,
  formTypes: string[]
) {
  try {
    const now = new Date();
    const month = MONTH_NAMES[now.getMonth() + 1];
    const year = now.getFullYear();

    for (const formType of formTypes) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: ActivityAction.FORM_CREATED,
          entityType: formType,
          description: `New ${formType} form cycle started for ${month} ${year}`,
          metadata: {
            status: 'REFRESHED',
            month,
            year,
            refreshDate: now.toISOString()
          }
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error logging monthly refresh:", error);
    return { error: "Failed to log monthly refresh" };
  }
}

export async function getUserActivityLogsAction(
  userId: string,
  limit: number = 100
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  // Users can only see their own logs unless they're admin
  if (session.user.id !== userId && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return { error: "Forbidden" };
  }

  try {
    const logs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, logs };
  } catch (error) {
    console.error("Error fetching user activity logs:", error);
    return { error: "Failed to fetch activity logs" };
  }
}

export async function getAdminRelatedLogsAction(
  targetUserId: string,
  limit: number = 100
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return { error: "Forbidden" };
  }

  try {
    // Get logs for the target user
    const logs = await prisma.activityLog.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return { success: true, logs };
  } catch (error) {
    console.error("Error fetching admin related logs:", error);
    return { error: "Failed to fetch logs" };
  }
}