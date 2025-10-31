// src/actions/reports.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";
import { headers } from "next/headers";

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

export async function getAssignmentReportAction(
    { month, year }: { month: number; year: number }
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

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

    // 3. Fetch Audit Firm Assignments (Updated Logic)
    const auditAssignments = await prisma.agencyAssignment.findMany({
      where: {
        // Assigned before or during this month
        assignedAt: {
          lte: endDate,
        },
        // AND (is still active OR was deactivated during/after this month)
        OR: [
          { isActive: true },
          { isActive: false, updatedAt: { gte: startDate } }
        ]
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
      updatedAt: a.updatedAt, // Pass updated date
    }));

    // 4. Fetch Collection Manager Assignments (Updated Logic)
    const cmAssignments = await prisma.cMAgencyAssignment.findMany({
      where: {
        // Assigned before or during this month
        assignedAt: {
          lte: endDate,
        },
        // AND (is still active OR was deactivated during/after this month)
        OR: [
          { isActive: true },
          { isActive: false, updatedAt: { gte: startDate } }
        ]
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
      updatedAt: a.updatedAt, // Pass updated date
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