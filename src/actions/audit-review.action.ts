"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, AuditStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { getErrorMessage } from "@/lib/utils";

/**
 * Fetches ALL audits for the admin view, regardless of status.
 * This populates the Admin's audit management page.
 */
export async function getAuditReviewQueueAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden: You do not have permission to view this page." };
  }

  try {
    const audits = await prisma.audit.findMany({
      // REMOVED: where: { status: AuditStatus.COMPLETED, scorecard: null }
      // This now fetches all audits
      include: {
        agency: {
          select: { id: true, name: true },
        },
        firm: {
          select: { id: true, name: true },
        },
        scorecard: { // ADDED: Include scorecard to check if it exists
          select: { id: true } 
        },
      },
      orderBy: {
        auditDate: 'desc', // MODIFIED: Show newest audits first
      },
    });

    return { success: true, data: audits, audits };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}