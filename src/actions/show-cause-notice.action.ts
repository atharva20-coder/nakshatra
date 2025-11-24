"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  NotificationType,
  ActivityAction,
  ShowCauseStatus,
  ObservationStatus
} from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { createNotificationAction } from "@/actions/notification.action";
import { getErrorMessage } from "@/lib/utils";

/**
 * Admin: Issue a new Show Cause Notice to an Agency
 */
export async function issueShowCauseNoticeAction(
  agencyId: string,
  observationIds: string[],
  subject: string,
  details: string,
  responseDueDate: Date
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Admin access required." };
  }

  try {
    const agency = await prisma.user.findFirst({
      where: { id: agencyId, role: UserRole.USER }
    });
    if (!agency) {
      return { error: "Agency not found." };
    }

    if (observationIds.length === 0) {
      return { error: "At least one observation must be selected." };
    }

    const newNotice = await prisma.showCauseNotice.create({
      data: {
        issuedByAdminId: session.user.id,
        receivedByAgencyId: agencyId,
        subject,
        details,
        responseDueDate,
        status: ShowCauseStatus.ISSUED,
      }
    });

    // Link observations to this notice and update their status
    await prisma.observation.updateMany({
      where: {
        id: { in: observationIds },
        audit: { agencyId: agencyId } // Security check
      },
      data: {
        showCauseNoticeId: newNotice.id,
        status: ObservationStatus.SENT_TO_AGENCY, // Mark them as sent
        responseDeadline: responseDueDate // Set deadline on observation
      }
    });

    await logFormActivityAction({
      action: ActivityAction.SHOW_CAUSE_ISSUED,
      entityType: 'ShowCauseNotice',
      entityId: newNotice.id,
      description: `Issued show cause notice to ${agency.name}: ${subject}`,
      metadata: { agencyId, subject, observationCount: observationIds.length }
    });

    await createNotificationAction(
      agencyId,
      NotificationType.SHOW_CAUSE_ISSUED,
      "New Show Cause Notice Issued",
      `You have received a new show cause notice: "${subject}". Please respond by ${responseDueDate.toLocaleDateString()}.`,
      `/user/show-cause/${newNotice.id}`, // Link to new SCN page
      newNotice.id,
      "show_cause_notice"
    );

    revalidatePath(`/admin/audits`); // Revalidate admin audit pages
    revalidatePath(`/user/show-cause`); // Revalidate new agency SCN list page

    return { success: true, data: newNotice, newNotice };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Agency: Get all Show Cause Notices for the dashboard
 */
export async function getShowCauseNoticesForAgencyAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== UserRole.USER) {
    return { error: "Unauthorized" };
  }

  try {
    const notices = await prisma.showCauseNotice.findMany({
      where: { receivedByAgencyId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { observations: true } }
      }
    });
    return { success: true, data: notices };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Agency/Admin: Get details of one Show Cause Notice
 */
export async function getShowCauseNoticeDetailsAction(noticeId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return { success: false, error: "Unauthorized" as const };

  try {
    const notice = await prisma.showCauseNotice.findFirst({
      where: { id: noticeId },
      include: {
        issuedByAdmin: { select: { name: true } },
        receivedByAgency: { select: { name: true } },
        observations: {
          orderBy: { observationNumber: 'asc' },
          include: {
            penalty: true,
            audit: {
              include: {
                firm: {
                  select: { name: true }
                },
                auditor: {
                  include: {
                    user: {
                      select: { name: true }
                    }
                  }
                }
              }
            },
            _count: { select: { comments: true } }
          }
        },
        responses: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!notice) {
      return { success: false, error: "Notice not found." };
    }

    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;
    const isOwner = notice.receivedByAgencyId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, error: "Forbidden: You do not have permission to view this notice." };
    }

    // --- THIS IS THE FIX ---
    // Return a single `data` object
    return { success: true, data: JSON.parse(JSON.stringify({ notice, isAdmin })) };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Admin: Close a Show Cause Notice
 */
export async function closeShowCauseNoticeAction(noticeId: string, adminRemarks: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Admin access required." };
  }

  try {
    const notice = await prisma.showCauseNotice.update({
      where: { id: noticeId },
      data: {
        status: ShowCauseStatus.CLOSED,
        adminRemarks: adminRemarks
      }
    });

    await logFormActivityAction({
      action: ActivityAction.SHOW_CAUSE_CLOSED,
      entityType: 'ShowCauseNotice',
      entityId: noticeId,
      description: `Admin closed show cause notice: ${notice.subject}`,
      metadata: { noticeId, adminRemarks }
    });

    await createNotificationAction(
      notice.receivedByAgencyId,
      NotificationType.SHOW_CAUSE_CLOSED,
      "Show Cause Notice Closed",
      `The notice "${notice.subject}" has been closed by the admin.`,
      `/user/show-cause/${noticeId}`,
      noticeId,
      "show_cause_notice"
    );

    revalidatePath(`/admin/show-cause/${noticeId}`);
    revalidatePath(`/user/show-cause/${noticeId}`);

    return { success: true, data: notice, notice };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}