// src/actions/agency-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getErrorMessage } from "@/lib/utils";

/**
 * Agency: Get all completed audits that have a scorecard published
 */
export async function getCompletedAuditsForAgency() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== "USER") {
    return { error: "Unauthorized" };
  }

  try {
    const scoredAudits = await prisma.audit.findMany({
      where: {
        agencyId: session.user.id,
        scorecard: {
          isNot: null // Scorecard MUST be published
        }
      },
      include: {
        firm: { select: { name: true } },
        scorecard: { select: { auditScore: true, auditGrade: true } }
      },
      orderBy: {
        auditDate: 'desc'
      }
    });

    return { success: true, audits: scoredAudits };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}