// src/actions/bulk-scn.action.ts
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
 * Get all agencies with pending observations for bulk SCN issuance
 */
export async function getAgenciesWithPendingObservationsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Admin access required." };
  }

  try {
    // Get all observations that are pending admin review
    const observations = await prisma.observation.findMany({
      where: {
        status: ObservationStatus.PENDING_ADMIN_REVIEW,
      },
      include: {
        audit: {
          include: {
            agency: {
              select: { id: true, name: true, email: true }
            },
            firm: {
              select: { name: true }
            },
            auditor: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group observations by agency
    const agencyMap = new Map<string, {
      agency: { id: string; name: string; email: string };
      observations: typeof observations;
      totalObservations: number;
      highSeverityCount: number;
      criticalSeverityCount: number;
    }>();

    observations.forEach(obs => {
      const agencyId = obs.audit.agency.id;
      
      if (!agencyMap.has(agencyId)) {
        agencyMap.set(agencyId, {
          agency: obs.audit.agency,
          observations: [],
          totalObservations: 0,
          highSeverityCount: 0,
          criticalSeverityCount: 0,
        });
      }

      const agencyData = agencyMap.get(agencyId)!;
      agencyData.observations.push(obs);
      agencyData.totalObservations++;
      
      if (obs.severity === 'HIGH') agencyData.highSeverityCount++;
      if (obs.severity === 'CRITICAL') agencyData.criticalSeverityCount++;
    });

    // Convert map to array
    const agencies = Array.from(agencyMap.values());

    return { success: true, agencies };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Issue bulk Show Cause Notices to multiple agencies
 */
export async function issueBulkShowCauseNoticesAction(data: {
  agencySelections: Array<{
    agencyId: string;
    observationIds: string[];
  }>;
  subject: string;
  details: string;
  responseDueDate: Date;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Admin access required." };
  }

  if (data.agencySelections.length === 0) {
    return { error: "No agencies selected for bulk issuance." };
  }

  if (!data.subject || !data.details || !data.responseDueDate) {
    return { error: "Subject, details, and due date are required." };
  }

  try {
    const results = await prisma.$transaction(async (tx) => {
      const issued: Array<{ agencyId: string; noticeId: string; agencyName: string }> = [];
      const errors: Array<{ agencyId: string; error: string }> = [];

      for (const selection of data.agencySelections) {
        try {
          const { agencyId, observationIds } = selection;

          if (observationIds.length === 0) {
            errors.push({ agencyId, error: "No observations selected" });
            continue;
          }

          // Get agency info
          const agency = await tx.user.findUnique({
            where: { id: agencyId },
            select: { id: true, name: true, email: true }
          });

          if (!agency) {
            errors.push({ agencyId, error: "Agency not found" });
            continue;
          }

          // Verify observations belong to this agency and are pending
          const observations = await tx.observation.findMany({
            where: {
              id: { in: observationIds },
              status: ObservationStatus.PENDING_ADMIN_REVIEW,
              audit: { agencyId: agencyId }
            }
          });

          if (observations.length !== observationIds.length) {
            errors.push({ 
              agencyId, 
              error: `Only ${observations.length} of ${observationIds.length} observations are valid` 
            });
            continue;
          }

          // Create Show Cause Notice
          const notice = await tx.showCauseNotice.create({
            data: {
              issuedByAdminId: session.user.id,
              receivedByAgencyId: agencyId,
              subject: data.subject,
              details: data.details,
              responseDueDate: data.responseDueDate,
              status: ShowCauseStatus.ISSUED,
            }
          });

          // Link observations to this notice
          await tx.observation.updateMany({
            where: {
              id: { in: observationIds },
            },
            data: {
              showCauseNoticeId: notice.id,
              status: ObservationStatus.SENT_TO_AGENCY,
              responseDeadline: data.responseDueDate,
              sentToAgencyAt: new Date(),
              sentBy: session.user.id,
              visibleToAgency: true,
            }
          });

          issued.push({ 
            agencyId, 
            noticeId: notice.id, 
            agencyName: agency.name 
          });

        } catch (error) {
          errors.push({ 
            agencyId: selection.agencyId, 
            error: getErrorMessage(error) 
          });
        }
      }

      return { issued, errors };
    });

    // Log activity for each issued notice
    for (const { agencyId, noticeId, agencyName } of results.issued) {
      await logFormActivityAction({
        action: ActivityAction.SHOW_CAUSE_ISSUED,
        entityType: 'ShowCauseNotice',
        entityId: noticeId,
        description: `Bulk issued show cause notice to ${agencyName}: ${data.subject}`,
        metadata: { 
          agencyId, 
          subject: data.subject, 
          bulkIssuance: true 
        }
      });

      // Notify each agency
      await createNotificationAction(
        agencyId,
        NotificationType.SHOW_CAUSE_ISSUED,
        "New Show Cause Notice Issued",
        `You have received a show cause notice: "${data.subject}". Please respond by ${data.responseDueDate.toLocaleDateString()}.`,
        `/user/show-cause/${noticeId}`,
        noticeId,
        "show_cause_notice"
      );
    }

    // Revalidate relevant paths
    revalidatePath('/admin/audits');
    revalidatePath('/admin/bulk-scn');
    revalidatePath('/user/show-cause');

    return { 
      success: true, 
      issued: results.issued,
      errors: results.errors,
      summary: {
        total: data.agencySelections.length,
        successful: results.issued.length,
        failed: results.errors.length
      }
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Get preview data for bulk SCN issuance
 */
export async function getObservationsByIdsAction(observationIds: string[]) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  try {
    const observations = await prisma.observation.findMany({
      where: {
        id: { in: observationIds },
      },
      include: {
        audit: {
          include: {
            agency: { select: { name: true } },
            firm: { select: { name: true } },
          }
        }
      }
    });

    return { success: true, observations };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}