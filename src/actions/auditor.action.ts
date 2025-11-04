// src/actions/auditor.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, AuditStatus, Observation } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import { logFormActivityAction } from "./activity-logging.action";

/**
 * Gets the dashboard data for the currently logged-in auditor.
 * Fetches their firm and all agencies assigned to that firm.
 */
export async function getAuditorDashboardDataAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  try {
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      include: { firm: true }
    });

    if (!auditor) {
      return { error: "Auditor profile not found." };
    }

    const assignments = await prisma.agencyAssignment.findMany({
      where: { firmId: auditor.firmId },
      include: {
        agency: { // Include the User (agency) details
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' } // Newer assignments at top
    });

    return { success: true, firm: auditor.firm, assignments };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * --- THIS ACTION HAS BEEN REMOVED ---
 * The 'AgencyAssignment' model in your schema does not have a 'viewedByAt' field.
 * Therefore, we cannot save the "viewed" status.
 */
// export async function markAssignmentAsViewedAction(assignmentId: string) { ... }


/**
 * Gets all audits for a specific agency, for the auditor to view.
 */
export async function getAgencyAuditHistoryAction(agencyId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  try {
    // Security: Check if auditor is assigned to this agency
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      select: { firmId: true }
    });
    
    const assignment = await prisma.agencyAssignment.findFirst({
        where: { agencyId: agencyId, firmId: auditor?.firmId }
    });

    if (!assignment) {
        return { error: "You are not assigned to this agency." };
    }

    const agency = await prisma.user.findUnique({
        where: { id: agencyId },
        select: { id: true, name: true, email: true }
    });
    
    const audits = await prisma.audit.findMany({
      where: { agencyId: agencyId, firmId: auditor?.firmId },
      include: { 
        auditor: { include: { user: { select: { name: true } } } },
        scorecard: true 
      },
      orderBy: { auditDate: 'desc' }
    });

    return { success: true, agency, audits };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Creates a new, blank audit record for an agency.
 */
export async function createNewAuditAction(agencyId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  try {
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!auditor) {
      return { error: "Auditor profile not found." };
    }
    
    // Check if agency is assigned to this auditor's firm
    const assignment = await prisma.agencyAssignment.findFirst({
        where: { agencyId: agencyId, firmId: auditor.firmId }
    });
    if (!assignment) {
        return { error: "You are not assigned to this agency." };
    }

    const newAudit = await prisma.audit.create({
      data: {
        agencyId: agencyId,
        firmId: auditor.firmId,
        auditorId: auditor.id,
        auditDate: new Date(),
        auditorName: auditor.user.name, // Pre-fill auditor name
        status: AuditStatus.IN_PROGRESS,
      }
    });
    
    revalidatePath(`/auditor/agencies/${agencyId}`);
    return { success: true, newAudit };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Fetches data for the observation form.
 */
export async function getAuditObservationDataAction(auditId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }
  
  try {
    const auditor = await prisma.auditor.findUnique({
        where: { userId: session.user.id }, select: { firmId: true }
    });
      
    const audit = await prisma.audit.findFirst({
      where: { 
        id: auditId,
        firmId: auditor?.firmId // Security check
      },
      include: { 
        agency: { select: { id: true, name: true } },
        observations: { orderBy: { createdAt: 'asc' } } 
      }
    });

    if (!audit) {
        return { error: "Audit not found or you do not have permission." };
    }
    
    return { success: true, audit };
    
  } catch (error) {
    return { error: getErrorMessage(error) }
  }
}

/**
 * Saves (upserts/deletes) observations for a specific audit.
 */
export async function saveAuditObservationsAction(
  auditId: string,
  observations: Partial<Observation>[]
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }
  
  try {
    const auditor = await prisma.auditor.findUnique({
        where: { userId: session.user.id }, select: { firmId: true }
    });

    const audit = await prisma.audit.findFirst({
      where: { id: auditId, firmId: auditor?.firmId }
    });

    if (!audit) {
      return { error: "Audit not found or you do not have permission." };
    }
    
    const observationIdsToKeep: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const obs of observations) {
        const dataToSave = {
          observationNumber: obs.observationNumber || "N/A",
          category: obs.category || "General",
          severity: obs.severity || "MEDIUM",
          description: obs.description || "",
          // Omit other fields, as they are for the agency response
        };

        const savedObs = await tx.observation.upsert({
          where: {
            id: obs.id && !obs.id.startsWith('new-') ? obs.id : 'dummy-id-for-create',
          },
          create: {
            ...dataToSave,
            auditId: auditId,
          },
          update: dataToSave,
        });
        observationIdsToKeep.push(savedObs.id);
      }
      
      // Delete observations that were removed from the UI
      await tx.observation.deleteMany({
        where: {
          auditId: auditId,
          id: {
            notIn: observationIdsToKeep,
          },
        },
      });
      
      // Update the audit status
      await tx.audit.update({
          where: { id: auditId },
          data: { status: AuditStatus.COMPLETED }
      });
    });

    await logFormActivityAction({
        action: ActivityAction.FORM_UPDATED,
        entityType: "audit",
        entityId: auditId,
        description: `Auditor saved ${observations.length} observations for audit.`,
        metadata: {
            auditId,
            observationCount: observations.length,
        }
    });

    revalidatePath(`/auditor/agencies/${audit.agencyId}/audit/${auditId}`);
    revalidatePath(`/auditor/agencies/${audit.agencyId}`);
    return { success: true, message: "Observations saved successfully." };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Checks the history for a specific observation number for a given agency.
 */
export async function getObservationHistoryAction(
  agencyId: string,
  observationNumber: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }
  
  if (!observationNumber) {
    return { success: true, count: 0 };
  }
  
  try {
    const count = await prisma.observation.count({
      where: {
        audit: {
          agencyId: agencyId
        },
        observationNumber: {
          equals: observationNumber,
          mode: 'insensitive'
        }
      }
    });
    
    return { success: true, count };
    
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}