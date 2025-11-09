// src/actions/announcement.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, Announcement } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";

// ---------- Shared Types ----------

interface CreateAnnouncementInput {
  title: string;
  content: string;
  audience: UserRole[];
}

// Discriminated union for consistent return shape
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------- Actions ----------

/**
 * 🧑‍💼 Super Admin: Create a new announcement
 */
export async function createAnnouncementAction(
  input: CreateAnnouncementInput
): Promise<ActionResponse<Announcement>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Forbidden: Super Admin access required." };
  }

  try {
    const newAnnouncement = await prisma.announcement.create({
      data: {
        authorId: session.user.id,
        title: input.title,
        content: input.content,
        audience: input.audience,
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
 * 🗑️ Super Admin: Delete an announcement
 */
export async function deleteAnnouncementAction(
  announcementId: string
): Promise<ActionResponse<null>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Forbidden: Super Admin access required." };
  }

  try {
    await prisma.announcement.delete({ where: { id: announcementId } });
    revalidatePath("/super/announcements");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * 🧑‍💼 Super Admin: Get all announcements for management
 */
export async function getAnnouncementsForSuperAdminAction(): Promise<
  ActionResponse<
    (Announcement & {
      author: { name: string | null };
      _count: { readBy: number };
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
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        _count: { select: { readBy: true } },
      },
    });

    return { success: true, data: announcements };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * 📨 All Users: Get unread announcements for user's role (for Marquee)
 */
export async function getUnreadAnnouncementsForUserAction(): Promise<
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
        readBy: { none: { userId: session.user.id } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: announcements };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * 📜 All Users: Get ALL advisories for user's role (for Advisory Page)
 */
export async function getAllAdvisoriesForUserAction(): Promise<
  ActionResponse<(Announcement & { isRead: boolean })[]>
> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const announcements = await prisma.announcement.findMany({
      where: { audience: { has: session.user.role } },
      include: {
        readBy: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
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
 * 👁️ All Users: Mark an announcement as read
 */
export async function markAnnouncementAsReadAction(
  announcementId: string
): Promise<ActionResponse<null>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: session.user.id,
        },
      },
      create: {
        announcementId,
        userId: session.user.id,
      },
      update: {
        readAt: new Date(),
      },
    });

    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
