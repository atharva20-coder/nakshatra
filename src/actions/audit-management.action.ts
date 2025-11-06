"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { UserRole, AuditStatus, ObservationStatus, ObservationSeverity, PenaltyStatus, ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getErrorMessage } from "@/lib/utils";

/**
 * Super Admin: Get a summary of all auditing firms and their stats.
 */
export async function getAuditingFirmsSummaryAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const firms = await prisma.auditingFirm.findMany({
      include: {
        _count: {
          select: { agencyAssignments: { where: { isActive: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, firms };
  } catch (error) {
     console.error("Error fetching auditing firms summary:", error);
    return { error: "Failed to fetch auditing firm data." };
  }
}


/**
 * Super Admin: Get all agencies and their assignment status for a specific firm.
 */
export async function getFirmAssignmentDetailsAction(firmId: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return { error: "Forbidden" };
    }
    try {
        const firm = await prisma.auditingFirm.findUnique({
            where: { id: firmId },
        });

        if (!firm) {
            return { error: "Auditing firm not found." };
        }

        const allAgencies = await prisma.user.findMany({
            where: { role: UserRole.USER },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });

        const allAssignments = await prisma.agencyAssignment.findMany({
            where: { isActive: true },
            include: { firm: { select: { name: true } } },
        });

        const agenciesWithStatus = allAgencies.map(agency => {
            const assignment = allAssignments.find(a => a.agencyId === agency.id);
            return {
                ...agency,
                isAssigned: !!assignment,
                isAssignedToCurrentFirm: assignment?.firmId === firmId,
                assignedFirmName: assignment?.firm.name ?? null,
            };
        });

        return { success: true, firm, agencies: agenciesWithStatus };
    } catch (error) {
        console.error(`Error fetching assignment details for firm ${firmId}:`, error);
        return { error: "Failed to fetch assignment details." };
    }
}

/**
 * Super Admin: Update assignments for a specific firm.
 */
export async function updateFirmAssignmentsAction(firmId: string, assignedAgencyIds: string[], unassignedAgencyIds: string[]) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return { error: "Forbidden" };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Deactivate assignments for agencies that were unchecked
            if (unassignedAgencyIds.length > 0) {
                await tx.agencyAssignment.updateMany({
                    where: {
                        firmId: firmId,
                        agencyId: { in: unassignedAgencyIds },
                    },
                    data: { isActive: false },
                });
            }

            // Create or update assignments for agencies that were checked
            if (assignedAgencyIds.length > 0) {
                for (const agencyId of assignedAgencyIds) {
                    await tx.agencyAssignment.upsert({
                        where: { agencyId_firmId: { agencyId, firmId } },
                        update: { isActive: true, assignedBy: session.user.id },
                        create: {
                            agencyId,
                            firmId,
                            assignedBy: session.user.id,
                            isActive: true,
                        },
                    });
                }
            }
        });
        
        revalidatePath('/super/audits');
        revalidatePath(`/super/audits/assign/${firmId}`);

        return { success: true };
    } catch (error) {
        console.error(`Error updating assignments for firm ${firmId}:`, error);
        return { error: "Failed to update assignments." };
    }
}


/**
 * Super Admin: Assign agency to auditing firm
 */
export async function assignAgencyToFirmAction(agencyId: string, firmId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden: Only super admins can assign agencies" };
  }

  try {
    const assignment = await prisma.agencyAssignment.create({
      data: {
        agencyId,
        firmId,
        assignedBy: session.user.id,
        isActive: true,
      },
      include: {
        agency: { select: { name: true } },
        firm: { select: { name: true } },
      },
    });

    // Log activity
    await logFormActivityAction({
        action: ActivityAction.AGENCY_ASSIGNED_TO_FIRM,
        entityType: 'agencyAssignment',
        description: `Assigned agency ${assignment.agency.name} to firm ${assignment.firm.name}`,
        entityId: assignment.id,
        metadata: { agencyId, firmId }
    });

    // Notify agency
    await createNotificationAction(
      agencyId,
      NotificationType.SYSTEM_ALERT,
      "Assigned to Auditing Firm",
      `Your agency has been assigned to ${assignment.firm.name} for auditing.`,
      "/profile" // Or a more relevant link
    );

    revalidatePath("/admin/audits"); // Assuming an admin page to view assignments
    revalidatePath("/auditor/dashboard");

    return { success: true, assignment };
  } catch (error: unknown) { // Use unknown for catch
    console.error("Error assigning agency:", error);
    // Handle potential unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { error: "This agency is already assigned to this firm." };
    }
    if (error instanceof Error) {
        return { error: `Failed to assign agency to firm: ${error.message}` };
    }
    return { error: "Failed to assign agency to firm due to an unknown error." };
  }
}

/**
 * Auditor: Get assigned agencies
 */
export async function getAssignedAgenciesAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.AUDITOR) {
    return { error: "Forbidden: Only auditors can view assignments" };
  }

  try {
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
      include: { firm: true },
    });

    if (!auditor) {
      return { error: "Auditor profile not found" };
    }

    const assignments = await prisma.agencyAssignment.findMany({
      where: {
        firmId: auditor.firmId,
        isActive: true,
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        firm: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { agency: { name: 'asc' } },
    });

    return { success: true, assignments, firm: auditor.firm };
  } catch (error: unknown) { // Use unknown
    console.error("Error fetching assigned agencies:", error);
     if (error instanceof Error) {
        return { error: `Failed to fetch assigned agencies: ${error.message}` };
    }
    return { error: "Failed to fetch assigned agencies due to an unknown error." };
  }
}

// Super Admin: Get data needed for assignment page
export async function getAssignmentDataAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden: Only super admins can access assignment data" };
  }

  try {
    const agencies = await prisma.user.findMany({
      where: { role: UserRole.USER }, // Only fetch users with the 'USER' role (Agencies)
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    const firms = await prisma.auditingFirm.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Also fetch existing assignments to display them
    const existingAssignments = await prisma.agencyAssignment.findMany({
       where: { isActive: true }, // Or fetch all if you want to show inactive ones too
       include: {
           agency: { select: { name: true } },
           firm: { select: { name: true } }
       },
       orderBy: { createdAt: 'desc'}
    });

    return { success: true, agencies, firms, existingAssignments };
  } catch (error: unknown) {
    console.error("Error fetching assignment data:", error);
    if (error instanceof Error) {
        return { error: `Failed to fetch assignment data: ${error.message}` };
    }
    return { error: "Failed to fetch data for assignment page due to an unknown error." };
  }
}


/**
 * Auditor: Create new audit record
 */
export async function createAuditAction(data: {
  agencyId: string;
  auditDate: string;
  auditorName: string;
  auditorEmployeeId?: string;
  location?: string;
  remarks?: string;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.AUDITOR) {
    return { error: "Forbidden: Only auditors can create audits" };
  }

  try {
    const auditor = await prisma.auditor.findUnique({
      where: { userId: session.user.id },
    });

    if (!auditor) {
      return { error: "Auditor profile not found" };
    }

    const assignment = await prisma.agencyAssignment.findUnique({
      where: {
        agencyId_firmId: {
          agencyId: data.agencyId,
          firmId: auditor.firmId,
        },
        isActive: true,
      },
    });

    if (!assignment) {
      return { error: "Agency not assigned to your firm or assignment is inactive." };
    }

    const audit = await prisma.audit.create({
      data: {
        agencyId: data.agencyId,
        firmId: auditor.firmId,
        auditorId: auditor.id,
        auditDate: new Date(data.auditDate),
        auditorName: data.auditorName, // This is directly on the Audit model
        auditorEmployeeId: data.auditorEmployeeId,
        location: data.location,
        remarks: data.remarks,
        status: AuditStatus.IN_PROGRESS,
      },
    });

    await logFormActivityAction({
      action: ActivityAction.AUDIT_CREATED,
      entityType: 'audit',
      description: `Created new audit record for agency`,
      entityId: audit.id,
      metadata: {
        agencyId: data.agencyId,
        auditDate: data.auditDate,
        auditorName: data.auditorName,
      },
    });

    revalidatePath("/auditor/dashboard");
    revalidatePath(`/auditor/users/${data.agencyId}`);

    return { success: true, audit };
  } catch (error: unknown) { // Use unknown
    console.error("Error creating audit:", error);
     if (error instanceof Error) {
        return { error: `Failed to create audit: ${error.message}` };
    }
    return { error: "Failed to create audit. Please check input data." };
  }
}

/**
 * Auditor: Add observation to an existing audit
 */
export async function addObservationAction(data: {
  auditId: string;
  observationNumber: string;
  category: string;
  severity: ObservationSeverity;
  description: string;
  evidenceRequired: boolean;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.AUDITOR) {
    return { error: "Forbidden: Only auditors can add observations" };
  }

  try {
    const audit = await prisma.audit.findUnique({
        where: { id: data.auditId },
        include: { firm: true, agency: { select: { name: true } } }
    });

    if (!audit) {
        return { error: "Audit not found." };
    }

    const auditor = await prisma.auditor.findUnique({ where: { userId: session.user.id } });
    if (!auditor || auditor.firmId !== audit.firmId) {
        return { error: "Forbidden: You are not assigned to this audit's firm." };
    }

    const observation = await prisma.observation.create({
      data: {
        auditId: data.auditId,
        observationNumber: data.observationNumber,
        category: data.category,
        severity: data.severity,
        description: data.description,
        evidenceRequired: data.evidenceRequired,
        status: ObservationStatus.PENDING_ADMIN_REVIEW,
        visibleToAgency: false,
      },
    });

    await logFormActivityAction({
        action: ActivityAction.OBSERVATION_ADDED,
        entityType: 'observation',
        description: `Added observation ${data.observationNumber} to audit ${audit.id} for agency ${audit.agency.name}`,
        entityId: observation.id,
        metadata: { auditId: data.auditId, observationNumber: data.observationNumber, severity: data.severity }
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotificationAction(
        admin.id,
        NotificationType.SYSTEM_ALERT,
        "New Audit Observation Added",
        `Observation ${data.observationNumber} for agency ${audit.agency.name} requires review.`,
        `/admin/observations/${observation.id}`
      );
    }

    revalidatePath(`/auditor/audits/${data.auditId}`);
    revalidatePath("/admin/observations");

    return { success: true, observation };
  } catch (error: unknown) { // Use unknown
    console.error("Error adding observation:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { error: "Observation number already exists for this audit." };
    }
     if (error instanceof Error) {
        return { error: `Failed to add observation: ${error.message}` };
    }
    return { error: "Failed to add observation due to an unknown error." };
  }
}


/**
 * Admin/Super Admin: Send observation to agency and set deadline
 */
export async function sendObservationToAgencyAction(
  observationId: string,
  responseDeadlineDays: number
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Explicit check for ADMIN or SUPER_ADMIN roles
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Only admins or super admins can send observations" };
  }

  try {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + responseDeadlineDays);
    deadline.setHours(23, 59, 59, 999);

    const observation = await prisma.observation.update({
      where: { id: observationId },
      data: {
        visibleToAgency: true,
        sentToAgencyAt: new Date(),
        sentBy: session.user.id,
        status: ObservationStatus.SENT_TO_AGENCY,
        responseDeadline: deadline,
      },
      include: {
        audit: {
          include: {
            agency: { select: { id: true, name: true } },
          },
        },
      },
    });

     await logFormActivityAction({
        action: ActivityAction.OBSERVATION_SENT_TO_AGENCY,
        entityType: 'observation',
        description: `Sent observation ${observation.observationNumber} to agency ${observation.audit.agency.name}`,
        entityId: observation.id,
        metadata: { auditId: observation.auditId, responseDeadline: deadline.toISOString() }
    });

    await createNotificationAction(
      observation.audit.agencyId,
      NotificationType.SYSTEM_ALERT,
      "New Audit Observation Received",
      `Please review observation ${observation.observationNumber}. Respond by ${deadline.toLocaleDateString()}.`,
      `/user/observations/${observationId}`
    );

    revalidatePath("/admin/observations");
    revalidatePath(`/admin/observations/${observationId}`);
    revalidatePath(`/user/observations`);

    return { success: true, observation };
  } catch (error: unknown) { // Use unknown
    console.error("Error sending observation to agency:", error);
     if (error instanceof Error) {
        return { error: `Failed to send observation: ${error.message}` };
    }
    return { error: "Failed to send observation to agency due to an unknown error." };
  }
}

/**
 * Agency: Respond to an observation
 */
export async function respondToObservationAction(
  observationId: string,
  accepted: boolean,
  response?: string,
  evidencePath?: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.USER) {
    return { error: "Unauthorized: Only agencies can respond" };
  }

  try {
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: { audit: true },
    });

    if (!observation || observation.audit.agencyId !== session.user.id) {
      return { error: "Observation not found or access denied" };
    }
    if (observation.status !== ObservationStatus.SENT_TO_AGENCY) {
      return { error: "Observation cannot be responded to at this time." };
    }
    if (observation.responseDeadline && new Date() > observation.responseDeadline) {
      return { error: "Response deadline has passed. Observation may have been auto-accepted." };
    }
    if (!accepted && !evidencePath && observation.evidenceRequired) {
        return { error: "Evidence is required to dispute this observation." };
    }
     if (!accepted && !response) {
        return { error: "A response remark is required when disputing an observation." };
    }

    const newStatus = accepted ? ObservationStatus.AGENCY_ACCEPTED : ObservationStatus.AGENCY_DISPUTED;

    const updatedObservation = await prisma.observation.update({
      where: { id: observationId },
      data: {
        agencyAccepted: accepted,
        agencyResponse: accepted ? null : response,
        agencyResponseDate: new Date(),
        evidenceSubmitted: !accepted && !!evidencePath,
        evidencePath: accepted ? null : evidencePath,
        status: newStatus,
      },
    });

     await logFormActivityAction({
        action: ActivityAction.OBSERVATION_RESPONDED,
        entityType: 'observation',
        description: `Agency responded to observation ${observation.observationNumber}: ${accepted ? 'Accepted' : 'Disputed'}`,
        entityId: observation.id,
        metadata: { auditId: observation.auditId, accepted, responseProvided: !!response, evidenceSubmitted: !!evidencePath }
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      select: { id: true },
    });
    const notificationTitle = `Observation ${accepted ? 'Accepted' : 'Disputed'} by Agency`;
    const notificationMessage = `Agency ${session.user.name} has ${accepted ? 'accepted' : 'disputed'} observation ${observation.observationNumber}.`;

    for (const admin of admins) {
      await createNotificationAction(
        admin.id,
        NotificationType.SYSTEM_ALERT,
        notificationTitle,
        notificationMessage,
        `/admin/observations/${observationId}`
      );
    }

    revalidatePath("/user/observations");
    revalidatePath(`/user/observations/${observationId}`);
    revalidatePath("/admin/observations");
    revalidatePath(`/admin/observations/${observationId}`);

    return { success: true, observation: updatedObservation };
  } catch (error: unknown) { // Use unknown
    console.error("Error responding to observation:", error);
     if (error instanceof Error) {
        return { error: `Failed to submit response: ${error.message}` };
    }
    return { error: "Failed to submit response due to an unknown error." };
  }
}

/**
 * Admin/Super Admin: Assign penalty to an accepted/auto-accepted observation
 */
export async function assignPenaltyAction(data: {
  observationId: string;
  penaltyAmount: number;
  penaltyReason: string;
  deductionMonth: string;
  correctiveAction?: string;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Explicit check
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Only admins or super admins can assign penalties" };
  }

  try {
    const observation = await prisma.observation.findUnique({
      where: { id: data.observationId },
      include: { audit: true },
    });

    if (!observation) {
      return { error: "Observation not found" };
    }

    // Ensure penalty can be assigned (observation accepted or auto-accepted)
    // Corrected check:
    if (observation.status !== ObservationStatus.AGENCY_ACCEPTED && observation.status !== ObservationStatus.AUTO_ACCEPTED) {
        return { error: "Penalty can only be assigned to accepted or auto-accepted observations." };
    }

    if (observation.penaltyAssigned) {
        return { error: "A penalty has already been assigned to this observation." };
    }

    const result = await prisma.$transaction(async (prisma) => {
        const penalty = await prisma.penalty.create({
            data: {
                observationId: data.observationId,
                agencyId: observation.audit.agencyId,
                penaltyAmount: data.penaltyAmount,
                penaltyReason: data.penaltyReason,
                deductionMonth: data.deductionMonth,
                correctiveAction: data.correctiveAction,
                assignedBy: session.user.id,
                status: PenaltyStatus.DRAFT,
                assignedAt: new Date(),
            },
        });

        const updatedObservation = await prisma.observation.update({
            where: { id: data.observationId },
            data: {
                penaltyAssigned: true,
                penaltyId: penalty.id,
                status: ObservationStatus.CLOSED,
            },
        });

        return { penalty, updatedObservation };
    });

    await logFormActivityAction({
        action: ActivityAction.PENALTY_ASSIGNED,
        entityType: 'penalty',
        description: `Assigned penalty (ID: ${result.penalty.id}) of ${data.penaltyAmount} for observation ${observation.observationNumber}`,
        entityId: result.penalty.id,
        metadata: { observationId: data.observationId, amount: data.penaltyAmount, deductionMonth: data.deductionMonth }
    });

    revalidatePath("/admin/observations");
    revalidatePath(`/admin/observations/${data.observationId}`);
    revalidatePath("/admin/penalties");

    return { success: true, penalty: result.penalty };
  } catch (error: unknown) { // Use unknown
    console.error("Error assigning penalty:", error);
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { error: "Failed to assign penalty due to a conflict. Please check observation status." };
    }
     if (error instanceof Error) {
        return { error: `Failed to assign penalty: ${error.message}` };
    }
    return { error: "Failed to assign penalty due to an unknown error." };
  }
}

/**
 * Admin/Super Admin: Submit penalty (make visible to agency)
 */
export async function submitPenaltyAction(penaltyId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Explicit check
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: Only admins or super admins can submit penalties" };
  }

  try {
    const penalty = await prisma.penalty.update({
      where: { id: penaltyId, status: PenaltyStatus.DRAFT },
      data: {
        status: PenaltyStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        agency: { select: { id: true, name: true } },
         observation: { select: { observationNumber: true } } // Include observation number
      },
    });

    if (!penalty) {
        return { error: "Penalty not found or already submitted." };
    }

     await logFormActivityAction({
        action: ActivityAction.PENALTY_SUBMITTED,
        entityType: 'penalty',
        description: `Submitted penalty (ID: ${penaltyId}) for agency ${penalty.agency.name}`,
        entityId: penaltyId,
        metadata: { agencyId: penalty.agencyId, amount: penalty.penaltyAmount }
    });

    await createNotificationAction(
      penalty.agencyId,
      NotificationType.SYSTEM_ALERT,
      "Penalty Issued",
       // Use observation number in message
      `A penalty of ₹${penalty.penaltyAmount} has been issued for observation ${penalty.observation?.observationNumber ?? penalty.observationId}. Details available in Penalty Matrix.`,
      "/user/penalty-matrix"
    );

    revalidatePath("/admin/penalties");
    revalidatePath(`/admin/penalties/${penaltyId}`);
    revalidatePath("/user/penalty-matrix");

    return { success: true, penalty };
  } catch (error: unknown) { // Use unknown
    console.error("Error submitting penalty:", error);
     if (error instanceof Error) {
        return { error: `Failed to submit penalty: ${error.message}` };
    }
    return { error: "Failed to submit penalty due to an unknown error." };
  }
}


/**
 * Get observations (for Admin/Super Admin view) with filtering
 */
export async function getObservationsForAdminAction(filters?: {
  status?: ObservationStatus;
  severity?: ObservationSeverity;
  agencyId?: string;
  firmId?: string;
  auditId?: string;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Explicit check
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  try {
    // Define the type for the where clause
    const where: Prisma.ObservationWhereInput = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.auditId) {
        where.auditId = filters.auditId;
    } else {
        const auditWhere: Prisma.AuditWhereInput = {};
        if (filters?.agencyId) auditWhere.agencyId = filters.agencyId;
        if (filters?.firmId) auditWhere.firmId = filters.firmId;
        // Only add the audit relation filter if agencyId or firmId is present
        if (filters?.agencyId || filters?.firmId) {
             where.audit = auditWhere;
        }
    }

    const observations = await prisma.observation.findMany({
      where,
      include: {
        audit: {
          include: {
            agency: { select: { id: true, name: true, email: true } },
            auditor: {
              include: {
                user: { select: { name: true } },
                firm: { select: { name: true } },
              },
            },
          },
        },
        penalty: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { success: true, observations };
  } catch (error: unknown) { // Use unknown
    console.error("Error fetching observations for admin:", error);
     if (error instanceof Error) {
        return { error: `Failed to fetch observations: ${error.message}` };
    }
    return { error: "Failed to fetch observations due to an unknown error." };
  }
}

/**
 * Get observations visible to the currently logged-in agency
 */
export async function getObservationsForAgencyAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.USER) {
    return { error: "Unauthorized" };
  }

  try {
    const observations = await prisma.observation.findMany({
      where: {
        audit: { agencyId: session.user.id },
        visibleToAgency: true,
      },
      include: {
        audit: {
          include: {
            firm: { select: { name: true } },
             // Select auditorName directly from Audit model
             auditor: { select: { user: { select: { name: true } } } }, // Get auditor's user name if needed
          },
        },
        penalty: {
          where: {
            status: { in: [PenaltyStatus.SUBMITTED, PenaltyStatus.ACKNOWLEDGED, PenaltyStatus.PAID] },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map audit data to include the correct auditor name
    const formattedObservations = observations.map(obs => ({
        ...obs,
        audit: {
            ...obs.audit,
            auditorName: obs.audit.auditorName // Use the name stored on the Audit record
        }
    }));


    return { success: true, observations: formattedObservations };
  } catch (error: unknown) { // Use unknown
    console.error("Error fetching observations for agency:", error);
     if (error instanceof Error) {
        return { error: `Failed to fetch observations: ${error.message}` };
    }
    return { error: "Failed to fetch observations due to an unknown error." };
  }
}


/**
 * Get penalties for the currently logged-in agency (for penalty matrix form)
 */
export async function getPenaltiesForAgencyAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.USER) {
    return { error: "Unauthorized" };
  }

  try {
    const penalties = await prisma.penalty.findMany({
      where: {
        agencyId: session.user.id,
        status: { in: [PenaltyStatus.SUBMITTED, PenaltyStatus.ACKNOWLEDGED, PenaltyStatus.PAID] },
      },
      include: {
        observation: {
          select: {
            observationNumber: true,
            category: true,
            severity: true,
            description: true,
            audit: {
              select: {
                  auditDate: true,
                  auditorName: true, // Select auditor name from Audit
                  firm: { select: { name: true } }
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, penalties };
  } catch (error: unknown) { // Use unknown
    console.error("Error fetching penalties for agency:", error);
     if (error instanceof Error) {
        return { error: `Failed to fetch penalties: ${error.message}` };
    }
    return { error: "Failed to fetch penalties due to an unknown error." };
  }
}

/**
 * SYSTEM ACTION: Auto-accept overdue observations
 */
export async function autoAcceptOverdueObservationsAction() {
  try {
    const now = new Date();
    const overdueObservations = await prisma.observation.findMany({
      where: {
        status: ObservationStatus.SENT_TO_AGENCY,
        responseDeadline: { lt: now },
        agencyAccepted: null,
      },
       include: {
           audit: { include: { agency: { select: { id: true, name: true } } } }
       }
    });

    let count = 0;
    for (const observation of overdueObservations) {
      await prisma.observation.update({
        where: { id: observation.id },
        data: {
          status: ObservationStatus.AUTO_ACCEPTED,
          agencyAccepted: true,
          autoAcceptedAt: now,
          agencyResponse: "Auto-accepted due to expired deadline.",
        },
      });
      count++;

        await logFormActivityAction({
            action: ActivityAction.OBSERVATION_RESPONDED,
            entityType: 'observation',
            description: `Observation ${observation.observationNumber} for ${observation.audit.agency.name} was auto-accepted`,
            entityId: observation.id,
            metadata: { auditId: observation.auditId, autoAccepted: true }
        });

      const admins = await prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
        select: { id: true },
      });

      for (const admin of admins) {
        await createNotificationAction(
          admin.id,
          NotificationType.SYSTEM_ALERT,
          "Observation Auto-Accepted",
          `Observation ${observation.observationNumber} for agency ${observation.audit.agency.name} was auto-accepted due to timeout.`,
          `/admin/observations/${observation.id}`
        );
      }

        await createNotificationAction(
            observation.audit.agencyId,
            NotificationType.SYSTEM_ALERT,
            "Observation Auto-Accepted",
            `Observation ${observation.observationNumber} was automatically accepted as the response deadline passed.`,
            `/user/observations/${observation.id}`
        );
    }

    console.log(`Auto-accepted ${count} overdue observations.`);
    return { success: true, count };
  } catch (error: unknown) { // Use unknown
    console.error("Error during auto-acceptance of observations:", error);
     if (error instanceof Error) {
        return { error: `Failed to auto-accept observations: ${error.message}` };
    }
    return { error: "Failed to auto-accept overdue observations due to an unknown error." };
  }
}

/**
 * Get Audit details for Auditor/Admin view
 */
export async function getAuditDetailsAction(auditId: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || (session.user.role !== UserRole.AUDITOR && session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Forbidden" };
    }

    try {
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
            include: {
                agency: { select: { id: true, name: true, email: true } },
                firm: { select: { name: true } },
                auditor: { include: { user: { select: { name: true } } } },
                observations: {
                    orderBy: { createdAt: 'asc' },
                    include: { penalty: true }
                }
            }
        });

        if (!audit) {
            return { error: "Audit not found" };
        }

        if (session.user.role === UserRole.AUDITOR) {
            const auditorProfile = await prisma.auditor.findUnique({ where: { userId: session.user.id } });
            if (!auditorProfile || auditorProfile.firmId !== audit.firmId) {
                return { error: "Forbidden: You do not have access to this audit." };
            }
        }

        return { success: true, audit };

    } catch (error: unknown) {
        console.error("Error fetching audit details:", error);
         if (error instanceof Error) {
            return { error: `Failed to fetch audit details: ${error.message}` };
        }
        return { error: "Failed to fetch audit details due to an unknown error." };
    }
}

/**
 * Admin: Get Audit, Observations, and Scorecard for review/scoring
 */
export async function getAuditForAdminAction(auditId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { error: "Forbidden" };
  }

  try {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        agency: { select: { id: true, name: true, email: true } },
        firm: { select: { name: true } },
        observations: { orderBy: { createdAt: 'asc' } },
        scorecard: true
      }
    });

    if (!audit) {
      return { error: "Audit not found" };
    }
    
    return { success: true, audit };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Admin: Save/Publish an Audit Scorecard
 */
export async function saveAuditScorecardAction(data: {
  auditId: string;
  auditPeriod: string;
  auditScore: number;
  auditGrade: string;
  auditCategory: string;
  finalObservation: string;
  justification: string;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { error: "Forbidden" };
  }

  try {
    // 1. Find the Auditor Profile ID
    const audit = await prisma.audit.findUnique({
      where: { id: data.auditId },
      select: { auditorId: true, agencyId: true, agency: { select: { name: true } } }
    });
    
    if (!audit) {
      return { error: "Audit not found" };
    }

    // 2. Upsert the Scorecard
    const scorecard = await prisma.auditScorecard.upsert({
      where: { auditId: data.auditId },
      create: {
        auditId: data.auditId,
        auditorProfileId: audit.auditorId, // Link to the Auditor profile
        auditPeriod: data.auditPeriod,
        auditScore: data.auditScore,
        auditGrade: data.auditGrade,
        auditCategory: data.auditCategory,
        finalObservation: data.finalObservation,
        justification: data.justification,
        signedAt: new Date(),
      },
      update: {
        auditPeriod: data.auditPeriod,
        auditScore: data.auditScore,
        auditGrade: data.auditGrade,
        auditCategory: data.auditCategory,
        finalObservation: data.finalObservation,
        justification: data.justification,
      }
    });

    // 3. Log this action
    await logFormActivityAction({
      action: ActivityAction.PENALTY_SUBMITTED, // Using this as "Admin Review Complete"
      entityType: 'AuditScorecard',
      entityId: scorecard.id,
      description: `Admin published scorecard for audit on ${audit.agency.name}`,
      metadata: { ...data }
    });

    // 4. Notify the agency
    await createNotificationAction(
      audit.agencyId,
      NotificationType.SYSTEM_ALERT,
      "Audit Scorecard Published",
      `Your audit scorecard for the period ${data.auditPeriod} has been published.`,
      `/user/audits/${data.auditId}` // Link to the new agency view
    );
    
    revalidatePath(`/admin/audits/${data.auditId}`);
    revalidatePath(`/user/audits/${data.auditId}`);

    return { success: true, scorecard };

  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}