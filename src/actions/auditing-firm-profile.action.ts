"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";
import { headers } from "next/headers";

export async function getAuditingFirmProfileAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.AUDITOR) {
    return { error: "Unauthorized" };
  }

  try {
    // Find the Auditor record linked to the User session
    const auditor = await prisma.auditor.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        // Corrected: Use the correct relation name 'firm'
        firm: true,
      },
    });

    if (!auditor) {
      return { error: "Auditor profile not found." };
    }

    // Corrected: Check for 'auditor.firm'
    if (!auditor.firm) {
      return { error: "Auditor is not associated with any auditing firm." };
    }

    // Corrected: Return 'auditor.firm'
    return { success: true, firm: auditor.firm };
  } catch (error) {
    console.error("Error fetching auditing firm profile:", error);
    return { error: "Failed to fetch auditing firm profile." };
  }
}