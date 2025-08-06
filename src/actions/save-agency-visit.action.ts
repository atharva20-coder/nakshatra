"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgencyTableRow } from "@/app/agency/page";
import { headers } from "next/headers";
import { SubmissionStatus } from "@/generated/prisma";

export async function saveAgencyVisitAction(
  rows: Omit<AgencyTableRow, "id">[],
  status: "DRAFT" | "SUBMITTED"
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    // Basic validation: ensure there's at least one row with some data
    const hasData = rows.some(row => Object.values(row).some(val => val !== ''));
    if (!hasData) {
      return { error: "Cannot save empty form. Please fill in at least one row." };
    }

    const agencyVisit = await prisma.agencyVisit.create({
      data: {
        agencyId: session.user.id,
        status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
        details: {
          create: rows.map(row => ({
            srNo: row.srNo,
            dateOfVisit: row.dateOfVisit,
            employeeId: row.employeeId,
            employeeName: row.employeeName,
            mobileNo: row.mobileNo,
            branchLocation: row.branchLocation,
            product: row.product,
            bucketDpd: row.bucketDpd,
            timeIn: row.timeIn,
            timeOut: row.timeOut,
            signature: row.signature,
            purposeOfVisit: row.purposeOfVisit,
          })),
        },
      },
    });

    return { success: true, visitId: agencyVisit.id };
  } catch (err) {
    console.error("Error saving agency visit:", err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "An unknown error occurred while saving the visit." };
  }
}
