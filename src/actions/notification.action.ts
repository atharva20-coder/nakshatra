/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType, ActivityAction, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Create a notification for a user
 */
export async function createNotificationAction(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  relatedId?: string,
  relatedType?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        relatedId,
        relatedType,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { error: "Failed to create notification" };
  }
}

/**
 * Get notifications for current user
 */
export async function getNotificationsAction(unreadOnly = false) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const where: any = { userId: session.user.id };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return { success: true, notifications, unreadCount };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { error: "Failed to fetch notifications" };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationReadAction(notificationId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.notification.update({
      where: { id: notificationId, userId: session.user.id },
      data: { read: true, readAt: new Date() },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { error: "Failed to mark notification as read" };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsReadAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { error: "Failed to mark notifications as read" };
  }
}

/**
 * Delete notification
 */
export async function deleteNotificationAction(notificationId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.notification.delete({
      where: { id: notificationId, userId: session.user.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { error: "Failed to delete notification" };
  }
}

/**
 * Log user activity
 */
export async function logActivityAction(
  action: ActivityAction,
  entityType: string,
  description: string,
  entityId?: string,
  metadata?: any
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : null;
    const userAgent = headersList.get("user-agent");

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action,
        entityType,
        entityId,
        description,
        metadata: metadata || undefined,
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

/**
 * Get activity logs for current user
 */
export async function getActivityLogsAction(limit = 100) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const logs = await prisma.activityLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, logs };
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return { error: "Failed to fetch activity logs" };
  }
}

/**
 * Get activity logs for all users (Admin only)
 */
export async function getAllActivityLogsAction(filters?: {
  userId?: string;
  action?: ActivityAction;
  entityType?: string;
  limit?: number;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const where: any = {};
    
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
    });

    return { success: true, logs };
  } catch (error) {
    console.error("Error fetching all activity logs:", error);
    return { error: "Failed to fetch activity logs" };
  }
}

/**
 * Notify admin of new approval request
 */
export async function notifyAdminOfApprovalRequestAction(
  requestId: string,
  userId: string,
  userName: string,
  formType: string
) {
  try {
    // Get all admins
    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    // Create notification for each admin
    for (const admin of admins) {
      await createNotificationAction(
        admin.id,
        NotificationType.APPROVAL_REQUESTED,
        "New Approval Request",
        `${userName} has requested approval to edit ${formType}`,
        `/admin/approvals`,
        requestId,
        "approval_request"
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error notifying admins:", error);
    return { error: "Failed to notify admins" };
  }
}

/**
 * Notify user of approval decision
 */
export async function notifyUserOfApprovalDecisionAction(
  userId: string,
  approved: boolean,
  formType: string,
  formId: string,
  adminResponse?: string
) {
  try {
    await createNotificationAction(
      userId,
      approved ? NotificationType.APPROVAL_APPROVED : NotificationType.APPROVAL_REJECTED,
      approved ? "Request Approved" : "Request Rejected",
      approved
        ? `Your request to edit ${formType} has been approved. ${adminResponse || "You can now make changes."}`
        : `Your request to edit ${formType} has been rejected. ${adminResponse || ""}`,
      `/forms/${formType}/${formId}`,
      formId,
      "form"
    );

    return { success: true };
  } catch (error) {
    console.error("Error notifying user:", error);
    return { error: "Failed to notify user" };
  }
}