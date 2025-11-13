// src/actions/auditor.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, AuditStatus, Observation, ObservationSeverity, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import { logFormActivityAction } from "./activity-logging.action";

/**
 * Gets the dashboard data for the currently logged-in auditor (firm).
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
      where: { 
        firmId: auditor.firmId,
        isActive: true // Only show active assignments
      },
      include: {
        agency: { // Include the User (agency) details
          select: { id: true, name: true, email: true, image: true }
        }
      },
      // Order by viewed status (new first), then by date
      orderBy: [
        { viewedByAt: 'asc' }, // nulls first
        { createdAt: 'desc' }
      ]
    });

    return { success: true, firm: auditor.firm, assignments };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Marks an agency assignment as "viewed" by the auditor (firm).
 */
export async function markAssignmentAsViewedAction(assignmentId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  try {
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      select: { firmId: true }
    });
    
    if (!auditor) {
      return { error: "Auditor profile not found." };
    }

    const assignment = await prisma.agencyAssignment.findFirst({
        where: { id: assignmentId, firmId: auditor.firmId }
    });

    if (!assignment) {
        return { error: "Assignment not found or not assigned to your firm." };
    }

    // Only update if it hasn't been viewed yet
    if (assignment.viewedByAt === null) {
      await prisma.agencyAssignment.update({
        where: { id: assignmentId },
        data: { viewedByAt: new Date() }
      });
    }
    
    revalidatePath("/auditor/dashboard");
    return { success: true };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

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
    // Security: Check if auditor's firm is assigned to this agency
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      select: { firmId: true }
    });
    
    const assignment = await prisma.agencyAssignment.findFirst({
        where: { agencyId: agencyId, firmId: auditor?.firmId, isActive: true }
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
 * Accepts individual auditor details.
 */
export async function createNewAuditAction(
  agencyId: string,
  auditorName: string,
  auditorEmployeeId: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  if (!auditorName || !auditorEmployeeId) {
    return { error: "Auditor name and Employee ID are required." };
  }

  try {
    const auditorFirmProfile = await prisma.auditor.findUnique({ // Renamed variable
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!auditorFirmProfile) {
      return { error: "Auditor firm profile not found." };
    }
    
    const assignment = await prisma.agencyAssignment.findFirst({
        where: { agencyId: agencyId, firmId: auditorFirmProfile.firmId }
    });
    if (!assignment) {
        return { error: "You are not assigned to this agency." };
    }

    const newAudit = await prisma.audit.create({
      data: {
        agencyId: agencyId,
        firmId: auditorFirmProfile.firmId,
        auditorId: auditorFirmProfile.id,
        auditDate: new Date(),
        auditorName: auditorName,
        auditorEmployeeId: auditorEmployeeId,
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
          // Note: agencyResponse, status, etc., are handled by Admin/Agency actions
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
      
      // Update the audit status if it's new
      if (audit.status === AuditStatus.IN_PROGRESS) {
        await tx.audit.update({
            where: { id: auditId },
            data: { status: AuditStatus.COMPLETED } // Mark as completed by auditor
        });
      }
    });

    await logFormActivityAction({
        action: ActivityAction.FORM_UPDATED,
        entityType: "audit",
        entityId: auditId,
        description: `Auditor firm saved ${observations.length} observations for audit.`,
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
    // Check if auditor is assigned to this agency
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

    const count = await prisma.observation.count({
      where: {
        audit: {
          agencyId: agencyId,
          firmId: auditor?.firmId // Ensure count is only within the firm's audits
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

/**
 * Gets the AUDITING FIRM'S profile data for the profile page
 */
export async function getAuditorFirmProfile() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Get the Auditor record to find the firmId
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      select: { firmId: true }
    });

    if (!auditor) {
      return { error: "Auditor profile link not found." };
    }

    // 2. Get the AuditingFirm's details using the firmId
    const firmProfile = await prisma.auditingFirm.findUnique({
      where: { id: auditor.firmId },
    });

    if (!firmProfile) {
      return { error: "Auditing firm not found." };
    }
    
    // 3. Get the User details (for name, email)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true }
    });
    
    return { 
      success: true, 
      profile: {
        ...firmProfile,
        // Add user details for display
        accountName: user?.name,
        accountEmail: user?.email
      } 
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Updates the AUDITING FIRM'S profile details
 */
export async function updateAuditorFirmProfile(data: {
  address?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "AUDITOR") {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Get the Auditor record to find the firmId
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      select: { firmId: true }
    });

    if (!auditor) {
      return { error: "Auditor profile link not found." };
    }

    // 2. Update the AuditingFirm model
    const updatedFirmProfile = await prisma.auditingFirm.update({
      where: { id: auditor.firmId },
      data: {
        address: data.address,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    });

    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: 'AuditingFirmProfile',
      entityId: updatedFirmProfile.id,
      description: `Auditing firm updated its profile details`,
      metadata: { ...data }
    });

    revalidatePath("/profile");
    return { success: true, profile: updatedFirmProfile };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Agency: Get their own scored audit for read-only view
 */
export async function getScoredAuditForAgency(auditId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "USER") {
    return { error: "Unauthorized" };
  }

  try {
    const audit = await prisma.audit.findFirst({
      where: { 
        id: auditId,
        agencyId: session.user.id,
        scorecard: {
          isNot: null // <-- MUST have a scorecard to be viewed
        }
      },
      include: { 
        firm: { select: { name: true } },
        observations: { 
          // Agency should see all obs on a *final* report
          orderBy: { createdAt: 'asc' }
        },
        scorecard: true
      }
    });
    
    if (!audit) {
      return { error: "Audit not found or scorecard has not been published yet." };
    }
    
    return { success: true, audit };
    
  } catch (error) {
    return { error: getErrorMessage(error) }
  }
}