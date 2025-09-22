"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { MonthlyComplianceRow } from "@/types/forms";

type MonthlyComplianceInput = Omit<MonthlyComplianceRow, 'id'>[];

// Predefined list of compliance parameters
const COMPLIANCE_PARAMETERS = [
    "Agency has not violated any of the points mentioned in Code of Conduct (COC) for Collection Agencies.",
    "Antecedent verification of all employees has been done.",
    "Collection Executives visiting the customers have valid ID cards.",
    "Customer contact timings are being adhered to by the agency.",
    "Agency has not changed its office premises without prior intimation.",
    "Complaint Management process is followed as per guidelines.",
    "Call recording process has been adhered to as per guidelines.",
    "Agency has not indulged in any cash transaction with the customer.",
    "All settlements are being offered to the customer with prior approval from the bank.",
    "Agency has updated the manpower register with new joinees and resigned staff details.",
    "Trainings have been imparted to all the employees.",
];

export async function saveMonthlyComplianceAction(
  rows: MonthlyComplianceInput,
  status: "DRAFT" | "SUBMITTED",
  formId?: string | null
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const submissionStatus = status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
    const userId = session.user.id;
    
    if (!rows || rows.length === 0) {
      return { error: "At least one row is required." };
    }

    // Validate required fields
    for (const row of rows) {
      if (!row.complied || !row.complianceParameters) {
        return { error: "All compliance parameters and their status are required." };
      }
    }

    const detailsToCreate = rows.map(row => ({
      srNo: row.srNo,
      complianceParameters: row.complianceParameters,
      complied: row.complied,
      agencyRemarks: row.agencyRemarks || '',
      collectionManagerName: row.collectionManagerName || '',
      collectionManagerEmpId: row.collectionManagerEmpId || '',
      collectionManagerSign: row.collectionManagerSign || '',
      date: new Date(row.date), // Convert string date to Date object for database
    }));

    let existingForm = null;
    if (formId) {
      existingForm = await prisma.monthlyCompliance.findFirst({
        where: { 
          id: formId, 
          userId: userId,
          status: SubmissionStatus.DRAFT // Only allow updating draft forms
        },
      });
    }

    let savedForm;

    if (existingForm) {
      savedForm = await prisma.monthlyCompliance.update({
        where: { id: existingForm.id },
        data: {
          status: submissionStatus,
          details: {
            deleteMany: {},
            create: detailsToCreate,
          }
        },
        include: {
          details: true
        }
      });
    } else {
      savedForm = await prisma.monthlyCompliance.create({
        data: {
          userId: userId,
          status: submissionStatus,
          details: {
            create: detailsToCreate,
          }
        },
        include: {
          details: true
        }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/forms/monthlyCompliance`);
    revalidatePath(`/forms/monthlyCompliance/${savedForm.id}`);
    
    return { 
      success: true,
      formId: savedForm.id,
      form: savedForm
    };
  } catch (err) {
    console.error("Error saving Monthly Compliance:", err);
    return { error: "An unknown error occurred while saving the form." };
  }
}

export async function getMonthlyComplianceById(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    return null;
  }

  try {
    const form = await prisma.monthlyCompliance.findFirst({
      where: { 
        id: id, 
        userId: session.user.id 
      },
      include: {
        details: {
            orderBy: {
                srNo: 'asc'
            }
        }
      }
    });

    if (!form) {
      return null;
    }

    return form;
  } catch (error) {
    console.error("Error fetching Monthly Compliance:", error);
    return null;
  }
}

export async function getOrCreateCurrentMonthSubmission() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    try {
        let submission = await prisma.monthlyCompliance.findFirst({
            where: {
                userId: session.user.id,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            include: {
                details: {
                    orderBy: {
                        srNo: 'asc'
                    }
                }
            }
        });

        if (!submission) {
            submission = await prisma.monthlyCompliance.create({
                data: {
                    userId: session.user.id,
                    status: SubmissionStatus.DRAFT,
                    details: {
                        create: COMPLIANCE_PARAMETERS.map((param, index) => ({
                            srNo: (index + 1).toString(),
                            complianceParameters: param,
                            complied: 'NA',
                            agencyRemarks: '',
                            collectionManagerName: session.user?.name ?? '',
                            collectionManagerEmpId: '',
                            collectionManagerSign: '',
                            date: new Date(),
                        })),
                    },
                },
                include: {
                    details: {
                        orderBy: {
                            srNo: 'asc'
                        }
                    }
                }
            });
        }

        return submission;
    } catch (error) {
        console.error("Error in getOrCreateCurrentMonthSubmission:", error);
        return null;
    }
}

export async function deleteMonthlyComplianceAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    const form = await prisma.monthlyCompliance.findFirst({
      where: { id, userId: session.user.id }
    });

    if (!form) {
      return { error: "Form not found or you don't have permission to delete it." };
    }

    if (form.status === SubmissionStatus.SUBMITTED) {
      return { error: "Cannot delete a submitted form." };
    }

    await prisma.monthlyCompliance.delete({
      where: { id }
    });

    revalidatePath("/dashboard");
    revalidatePath("/forms/monthlyCompliance");
    return { success: true };
  } catch (error) {
    console.error("Error deleting Monthly Compliance:", error);
    return { error: "An unknown error occurred while deleting the form." };
  }
}

