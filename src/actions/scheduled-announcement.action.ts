// src/actions/scheduled-announcement.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, Announcement } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";

interface CreateScheduledAnnouncementInput {
  title: string;
  content: string;
  audience: UserRole[];
  isScheduled: boolean;
  scheduledFor?: Date;
}

type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Super Admin: Create a new announcement (immediate or scheduled)
 */
export async function createScheduledAnnouncementAction(
  input: CreateScheduledAnnouncementInput
): Promise<ActionResponse<Announcement>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Forbidden: Super Admin access required." };
  }

  try {
    const now = new Date();
    
    // Validation
    if (input.isScheduled) {
      if (!input.scheduledFor) {
        return { success: false, error: "Scheduled date is required for scheduled announcements." };
      }
      if (input.scheduledFor <= now) {
        return { success: false, error: "Scheduled date must be in the future." };
      }
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        authorId: session.user.id,
        title: input.title,
        content: input.content,
        audience: input.audience,
        isScheduled: input.isScheduled,
        scheduledFor: input.isScheduled ? input.scheduledFor : null,
        isPublished: !input.isScheduled, // Publish immediately if not scheduled
        publishedAt: !input.isScheduled ? now : null,
      },
    });

    // Revalidate relevant pages
    [
      "/super/announcements",
      "/admin/dashboard",
      "/user/dashboard",
      "/auditor/dashboard",
      "/collectionManager/dashboard",
    ].forEach((path) => revalidatePath(path));

    return { success: true, data: newAnnouncement };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Get all announcements (published and scheduled)
 */
export async function getAllAnnouncementsForSuperAdminAction(): Promise<
  ActionResponse<
    (Announcement & {
      author: { name: string | null };
      _count: { readBy: number };
      formattedScheduledFor?: string | null;
      formattedPublishedAt?: string | null;
    })[]
  >
> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [
        { isPublished: 'desc' },
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        author: { select: { name: true } },
        _count: { select: { readBy: true } },
      },
    });

    // 🔹 Format dates as deterministic UTC strings
    const formatted = announcements.map((a) => ({
      ...a,
      formattedScheduledFor: a.scheduledFor
        ? new Date(a.scheduledFor).toISOString().replace('T', ' ').slice(0, 16)
        : null,
      formattedPublishedAt: a.publishedAt
        ? new Date(a.publishedAt).toISOString().replace('T', ' ').slice(0, 16)
        : null,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}


/**
 * Get unread PUBLISHED announcements for user's role
 */
export async function getUnreadPublishedAnnouncementsForUserAction(): Promise<
  ActionResponse<Announcement[]>
> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        audience: { has: session.user.role },
        isPublished: true, // Only published announcements
        readBy: { none: { userId: session.user.id } },
      },
      orderBy: { publishedAt: 'desc' },
    });

    return { success: true, data: announcements };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Get all published advisories for user's role
 */
export async function getAllPublishedAdvisoriesForUserAction(): Promise<
  ActionResponse<(Announcement & { isRead: boolean })[]>
> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const announcements = await prisma.announcement.findMany({
      where: { 
        audience: { has: session.user.role },
        isPublished: true // Only published announcements
      },
      include: {
        readBy: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const advisories = announcements.map((a) => ({
      ...a,
      isRead: a.readBy.length > 0,
    }));

    return { success: true, data: advisories };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Cancel a scheduled announcement
 */
export async function cancelScheduledAnnouncementAction(
  announcementId: string
): Promise<ActionResponse<null>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Forbidden: Super Admin access required." };
  }

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) {
      return { success: false, error: "Announcement not found." };
    }

    if (announcement.isPublished) {
      return { success: false, error: "Cannot cancel an already published announcement." };
    }

    await prisma.announcement.delete({ where: { id: announcementId } });
    revalidatePath("/super/announcements");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Publish a scheduled announcement immediately
 */
export async function publishScheduledAnnouncementNowAction(
  announcementId: string
): Promise<ActionResponse<Announcement>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Forbidden: Super Admin access required." };
  }

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) {
      return { success: false, error: "Announcement not found." };
    }

    if (announcement.isPublished) {
      return { success: false, error: "Announcement is already published." };
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      }
    });

    // Revalidate all dashboards
    [
      "/super/announcements",
      "/admin/dashboard",
      "/user/dashboard",
      "/auditor/dashboard",
      "/collectionManager/dashboard",
    ].forEach((path) => revalidatePath(path));

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * CRON JOB: Publish scheduled announcements whose time has come
 * This should be called by a cron job (e.g., Vercel Cron, every 5-10 minutes)
 */
export async function publishDueAnnouncementsAction(): Promise<
  ActionResponse<{ published: number }>
> {
  try {
    const now = new Date();

    // Find all scheduled announcements whose time has come
    const dueAnnouncements = await prisma.announcement.findMany({
      where: {
        isScheduled: true,
        isPublished: false,
        scheduledFor: {
          lte: now
        }
      }
    });

    if (dueAnnouncements.length === 0) {
      return { success: true, data: { published: 0 } };
    }

    // Publish them
    await prisma.announcement.updateMany({
      where: {
        id: { in: dueAnnouncements.map(a => a.id) }
      },
      data: {
        isPublished: true,
        publishedAt: now,
      }
    });

    // Revalidate all dashboards
    [
      "/super/announcements",
      "/admin/dashboard",
      "/user/dashboard",
      "/auditor/dashboard",
      "/collectionManager/dashboard",
    ].forEach((path) => revalidatePath(path));

    return { success: true, data: { published: dueAnnouncements.length } };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}