// src/actions/reports.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, AuditStatus } from "@/generated/prisma"; // Added AuditStatus
import { headers } from "next/headers";
import { getErrorMessage } from "@/lib/utils"; // Import getErrorMessage

export interface AuditAssignmentReportItem {
  id: string;
  agencyName: string;
  firmName: string;
  assignedByName: string;
  assignedAt: Date;
  isActive: boolean;
  updatedAt: Date; // To track deactivation date
}

export interface CmAssignmentReportItem {
  id: string;
  agencyName: string;
  cmName: string;
  assignedByName: string;
  assignedAt: Date;
  isActive: boolean;
  updatedAt: Date; // To track deactivation date
}

// --- NEW INTERFACE ---
export interface AuditReportItem {
  id: string;
  agencyName: string;
  firmName: string;
  auditorName: string;
  auditDate: Date;
  status: AuditStatus;
  score: number | null;
  grade: string | null;
}
// --- END NEW INTERFACE ---

export async function getAssignmentReportAction(
    { month, year }: { month: number; year: number }
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // --- MODIFICATION: Allow ADMIN and SUPER_ADMIN ---
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }
  // --- END MODIFICATION ---

  try {
    // 1. Define date range for the selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 2. Create a lookup map for admin names
    const admins = await prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      select: { id: true, name: true }
    });
    const adminNameMap = new Map(admins.map(admin => [admin.id, admin.name]));
    const getAdminName = (id: string) => adminNameMap.get(id) || 'Unknown Admin';

    // 3. Fetch Audit Firm Assignments (Logic updated to use createdAt)
    const auditAssignments = await prisma.agencyAssignment.findMany({
      where: {
        // Assigned during this month
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        agency: { select: { name: true } },
        firm: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedAuditAssignments: AuditAssignmentReportItem[] = auditAssignments.map(a => ({
      id: a.id,
      agencyName: a.agency.name,
      firmName: a.firm.name,
      assignedByName: getAdminName(a.assignedBy),
      assignedAt: a.assignedAt,
      isActive: a.isActive,
      updatedAt: a.updatedAt,
    }));

    // 4. Fetch Collection Manager Assignments (Logic updated to use createdAt)
    const cmAssignments = await prisma.cMAgencyAssignment.findMany({
      where: {
        // Assigned during this month
        assignedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        agency: { select: { name: true } },
        cmProfile: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const formattedCmAssignments: CmAssignmentReportItem[] = cmAssignments.map(a => ({
      id: a.id,
      agencyName: a.agency.name,
      cmName: a.cmProfile.user.name,
      assignedByName: getAdminName(a.assignedBy),
      assignedAt: a.assignedAt,
      isActive: a.isActive,
      updatedAt: a.updatedAt,
    }));

    return { 
      success: true, 
      auditAssignments: formattedAuditAssignments, 
      cmAssignments: formattedCmAssignments 
    };

  } catch (error) {
    console.error("Error fetching assignment report:", error);
    return { 
      error: "Failed to fetch report data.",
      auditAssignments: [],
      cmAssignments: []
    };
  }
}

// --- NEW ACTION ---
/**
 * Admin/Super Admin: Get all audits and scorecards for a specific month
 */
export async function getAuditReportAction(
  { month, year }: { month: number; year: number }
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const audits = await prisma.audit.findMany({
      where: {
        // Find audits created or completed in this month
        OR: [
          {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            updatedAt: { // Use updatedAt to catch status changes (e.g., to COMPLETED or CLOSED)
              gte: startDate,
              lte: endDate,
            },
            status: { in: [AuditStatus.COMPLETED, AuditStatus.CLOSED] }
          }
        ]
      },
      include: {
        agency: { select: { name: true } },
        firm: { select: { name: true } },
        scorecard: {
          select: {
            auditScore: true,
            auditGrade: true,
          },
        },
      },
      orderBy: { auditDate: 'desc' },
    });
    
    const formattedAudits: AuditReportItem[] = audits.map(audit => ({
      id: audit.id,
      agencyName: audit.agency.name,
      firmName: audit.firm.name,
      auditorName: audit.auditorName,
      auditDate: audit.auditDate,
      status: audit.status,
      score: audit.scorecard?.auditScore ?? null,
      grade: audit.scorecard?.auditGrade ?? null,
    }));

    return { success: true, audits: formattedAudits };

  } catch (error) {
    console.error("Error fetching audit report:", error);
    return { 
      error: getErrorMessage(error),
      audits: []
    };
  }
}
// --- END NEW ACTION ---