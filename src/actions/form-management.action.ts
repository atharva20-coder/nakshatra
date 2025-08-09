/* eslint-disable @typescript-eslint/no-explicit-any */
// src/actions/form-management.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { SubmissionStatus } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

// Generic save action for any form type
export async function saveFormAction<T extends { id: number }>(
  formType: string,
  rows: Omit<T, "id">[],
  status: "DRAFT" | "SUBMITTED"
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    // Basic validation
    const hasData = rows.some(row => Object.values(row).some(val => val !== ''));
    if (!hasData) {
      return { error: "Cannot save empty form. Please fill in at least one row." };
    }

    let result;

    switch (formType) {
      case 'codeOfConduct':
        result = await saveCodeOfConduct(session.user.id, rows as any[], status);
        break;
      case 'declarationCumUndertaking':
        result = await saveDeclarationCumUndertaking(session.user.id, rows as any[], status);
        break;
      case 'agencyVisits':
        result = await saveAgencyVisits(session.user.id, rows as any[], status);
        break;
      case 'monthlyCompliance':
        result = await saveMonthlyCompliance(session.user.id, rows as any[], status);
        break;
      case 'assetManagement':
        result = await saveAssetManagement(session.user.id, rows as any[], status);
        break;
      case 'telephoneDeclaration':
        result = await saveTelephoneDeclaration(session.user.id, rows as any[], status);
        break;
      case 'manpowerRegister':
        result = await saveManpowerRegister(session.user.id, rows as any[], status);
        break;
      case 'productDeclaration':
        result = await saveProductDeclaration(session.user.id, rows as any[], status);
        break;
      case 'penaltyMatrix':
        result = await savePenaltyMatrix(session.user.id, rows as any[], status);
        break;
      case 'trainingTracker':
        result = await saveTrainingTracker(session.user.id, rows as any[], status);
        break;
      case 'proactiveEscalation':
        result = await saveProactiveEscalation(session.user.id, rows as any[], status);
        break;
      case 'escalationDetails':
        result = await saveEscalationDetails(session.user.id, rows as any[], status);
        break;
      case 'paymentRegister':
        result = await savePaymentRegister(session.user.id, rows as any[], status);
        break;
      case 'repoKitTracker':
        result = await saveRepoKitTracker(session.user.id, rows as any[], status);
        break;
      default:
        return { error: "Invalid form type" };
    }

    revalidatePath(`/forms/${formType}`);
    return result;

  } catch (err) {
    console.error(`Error saving ${formType}:`, err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "An unknown error occurred while saving the form." };
  }
}

// Individual save functions for each form type

async function saveCodeOfConduct(userId: string, rows: any[], status: string) {
  const codeOfConduct = await prisma.codeOfConduct.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      name: rows[0]?.name || "",
      signature: rows[0]?.signature || "",
      date: new Date(rows[0]?.date || new Date()),
    },
  });
  return { success: true, formId: codeOfConduct.id };
}

async function saveDeclarationCumUndertaking(userId: string, rows: any[], status: string) {
  const declaration = await prisma.declarationCumUndertaking.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      collectionManagers: {
        create: rows.map(row => ({
          name: row.collectionManagerName,
          employeeId: row.collectionManagerEmployeeId,
          signature: row.collectionManagerSignature,
        })),
      },
    },
  });
  return { success: true, formId: declaration.id };
}

async function saveAgencyVisits(userId: string, rows: any[], status: string) {
  const agencyVisit = await prisma.agencyVisit.create({
    data: {
      agencyId: userId,
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
  return { success: true, formId: agencyVisit.id };
}

async function saveMonthlyCompliance(userId: string, rows: any[], status: string) {
  const compliance = await prisma.monthlyCompliance.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          srNo: row.srNo,
          complianceParameters: row.complianceParameters,
          complied: row.complied,
          agencyRemarks: row.agencyRemarks,
          collectionManagerName: row.collectionManagerName,
          collectionManagerEmpId: row.collectionManagerEmpId,
          collectionManagerSign: row.collectionManagerSign,
          date: new Date(row.date),
        })),
      },
    },
  });
  return { success: true, formId: compliance.id };
}

async function saveAssetManagement(userId: string, rows: any[], status: string) {
  const assetManagement = await prisma.assetManagement.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          srNo: row.srNo,
          systemCpuSerialNo: row.systemCpuSerialNo,
          ipAddress: row.ipAddress,
          executiveName: row.executiveName,
          idCardNumber: row.idCardNumber,
          printerAccess: row.printerAccess,
          assetDisposed: row.assetDisposed,
        })),
      },
    },
  });
  return { success: true, formId: assetManagement.id };
}

async function saveTelephoneDeclaration(userId: string, rows: any[], status: string) {
  const telephoneDeclaration = await prisma.telephoneDeclaration.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          srNo: row.srNo,
          telephoneNo: row.telephoneNo,
          username: row.username,
          executiveCategory: row.executiveCategory,
          recordingLine: row.recordingLine,
          remarks: row.remarks,
        })),
      },
    },
  });
  return { success: true, formId: telephoneDeclaration.id };
}

async function saveManpowerRegister(userId: string, rows: any[], status: string) {
  const manpowerRegister = await prisma.agencyManpowerRegister.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          srNo: row.srNo,
          executiveCategory: row.executiveCategory,
          hhdIdOfFos: row.hhdIdOfFos,
          axisIdOfFos: row.axisIdOfFos,
          fosFullName: row.fosFullName,
          dateOfJoining: new Date(row.dateOfJoining),
          product: row.product,
          cocSigned: row.cocSigned,
          collectionManagerName: row.collectionManagerName,
          collectionManagerId: row.collectionManagerId,
          collectionManagerSign: row.collectionManagerSign,
          dateOfResignation: row.dateOfResignation ? new Date(row.dateOfResignation) : null,
          idCardsIssuanceDate: row.idCardsIssuanceDate ? new Date(row.idCardsIssuanceDate) : null,
          idCardReturnDate: row.idCardReturnDate ? new Date(row.idCardReturnDate) : null,
          executiveSignature: row.executiveSignature,
          remarks: row.remarks,
        })),
      },
    },
  });
  return { success: true, formId: manpowerRegister.id };
}

async function saveProductDeclaration(userId: string, rows: any[], status: string) {
  const productDeclaration = await prisma.productDeclaration.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          product: row.product,
          bucket: row.bucket,
          countOfCaseAllocated: parseInt(row.countOfCaseAllocated) || 0,
          collectionManagerName: row.collectionManagerName,
          collectionManagerLocation: row.collectionManagerLocation,
          cmSign: row.cmSign,
        })),
      },
    },
  });
  return { success: true, formId: productDeclaration.id };
}

async function savePenaltyMatrix(userId: string, rows: any[], status: string) {
  const penaltyMatrix = await prisma.agencyPenaltyMatrix.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          noticeRefNo: row.noticeRefNo,
          nonComplianceMonth: row.nonComplianceMonth,
          parameter: row.parameter,
          product: row.product,
          penaltyAmount: parseFloat(row.penaltyAmount) || 0,
          penaltyDeductedMonth: row.penaltyDeductedMonth,
          correctiveActionTaken: row.correctiveActionTaken,
          agency: row.agency,
          agencyAuthorisedPersonSign: row.agencyAuthorisedPersonSign,
          signOfFpr: row.signOfFpr,
        })),
      },
    },
  });
  return { success: true, formId: penaltyMatrix.id };
}

async function saveTrainingTracker(userId: string, rows: any[], status: string) {
  const trainingTracker = await prisma.agencyTrainingTracker.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          dateOfTraining: new Date(row.dateOfTraining),
          trainingAgenda: row.trainingAgenda,
          trainingName: row.trainingName,
          trainerName: row.trainerName,
          trainerEmpId: row.trainerEmpId,
          noOfAttendees: parseInt(row.noOfAttendees) || 0,
          trainerRemarks: row.trainerRemarks,
        })),
      },
    },
  });
  return { success: true, formId: trainingTracker.id };
}

async function saveProactiveEscalation(userId: string, rows: any[], status: string) {
  const proactiveEscalation = await prisma.proactiveEscalationTracker.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          lanCardNo: row.lanCardNo,
          customerName: row.customerName,
          product: row.product,
          currentBucket: row.currentBucket,
          dateOfContact: new Date(row.dateOfContact),
          modeOfContact: row.modeOfContact,
          dateOfTrailUploaded: row.dateOfTrailUploaded ? new Date(row.dateOfTrailUploaded) : null,
          listOfCaseWithReasons: row.listOfCaseWithReasons,
          collectionManagerNameId: row.collectionManagerNameId,
        })),
      },
    },
  });
  return { success: true, formId: proactiveEscalation.id };
}

async function saveEscalationDetails(userId: string, rows: any[], status: string) {
  const escalationDetails = await prisma.escalationDetails.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          customerName: row.customerName,
          loanCardNo: row.loanCardNo,
          productBucketDpd: row.productBucketDpd,
          dateEscalation: new Date(row.dateEscalation),
          escalationDetail: row.escalationDetail,
          collectionManagerRemark: row.collectionManagerRemark,
          collectionManagerSign: row.collectionManagerSign,
        })),
      },
    },
  });
  return { success: true, formId: escalationDetails.id };
}

async function savePaymentRegister(userId: string, rows: any[], status: string) {
  const paymentRegister = await prisma.paymentRegister.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          srNo: row.srNo,
          month: row.month,
          eReceiptNo: row.eReceiptNo,
          accountNo: row.accountNo,
          customerName: row.customerName,
          receiptAmount: parseFloat(row.receiptAmount) || 0,
          modeOfPayment: row.modeOfPayment,
          depositionDate: new Date(row.depositionDate),
          fosHhdId: row.fosHhdId,
          fosName: row.fosName,
          fosSign: row.fosSign,
          cmName: row.cmName,
          cmVerificationStatus: row.cmVerificationStatus,
          remarks: row.remarks,
        })),
      },
    },
  });
  return { success: true, formId: paymentRegister.id };
}

async function saveRepoKitTracker(userId: string, rows: any[], status: string) {
  const repoKitTracker = await prisma.repoKitTracker.create({
    data: {
      userId,
      status: status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED,
      details: {
        create: rows.map(row => ({
          srNo: row.srNo,
          repoKitNo: row.repoKitNo,
          issueDateFromBank: new Date(row.issueDateFromBank),
          lanNo: row.lanNo,
          product: row.product,
          bucketDpd: row.bucketDpd,
          usedUnused: row.usedUnused,
          executiveSign: row.executiveSign,
          dateOfReturnToCo: row.dateOfReturnToCo ? new Date(row.dateOfReturnToCo) : null,
          collectionManagerEmpId: row.collectionManagerEmpId,
          collectionManagerSign: row.collectionManagerSign,
        })),
      },
    },
  });
  return { success: true, formId: repoKitTracker.id };
}

// Get form data for a user
export async function getFormDataAction(formType: string, userId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  // Users can only access their own data, admins can access any user's data
  if (session.user.role !== "ADMIN" && session.user.id !== userId) {
    return { error: "Forbidden" };
  }

  try {
    let formData;

    switch (formType) {
      case 'codeOfConduct':
        formData = await prisma.codeOfConduct.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'declarationCumUndertaking':
        formData = await prisma.declarationCumUndertaking.findMany({
          where: { userId },
          include: { collectionManagers: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'agencyVisits':
        formData = await prisma.agencyVisit.findMany({
          where: { agencyId: userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'monthlyCompliance':
        formData = await prisma.monthlyCompliance.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'assetManagement':
        formData = await prisma.assetManagement.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'telephoneDeclaration':
        formData = await prisma.telephoneDeclaration.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'manpowerRegister':
        formData = await prisma.agencyManpowerRegister.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'productDeclaration':
        formData = await prisma.productDeclaration.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'penaltyMatrix':
        formData = await prisma.agencyPenaltyMatrix.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'trainingTracker':
        formData = await prisma.agencyTrainingTracker.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'proactiveEscalation':
        formData = await prisma.proactiveEscalationTracker.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'escalationDetails':
        formData = await prisma.escalationDetails.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'paymentRegister':
        formData = await prisma.paymentRegister.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      case 'repoKitTracker':
        formData = await prisma.repoKitTracker.findMany({
          where: { userId },
          include: { details: true },
          orderBy: { createdAt: 'desc' }
        });
        break;
      default:
        return { error: "Invalid form type" };
    }

    return { success: true, data: formData };

  } catch (err) {
    console.error(`Error fetching ${formType}:`, err);
    return { error: "Failed to fetch form data" };
  }
}

// Monthly auto-submission action (to be run as a cron job)
export async function autoSubmitOverdueForms() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Only admins can trigger auto-submission
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Check if we're past the 5th of the month
    if (now.getDate() <= 5) {
      return { message: "Not yet past submission deadline" };
    }

    // Get all users with draft forms for current month
    const usersWithDraftForms = await prisma.user.findMany({
      where: {
        role: "USER",
        OR: [
          { agencyVisits: { some: { status: SubmissionStatus.DRAFT } } },
          { monthlyCompliance: { some: { status: SubmissionStatus.DRAFT } } },
          { assetManagement: { some: { status: SubmissionStatus.DRAFT } } },
          // Add other form types as needed
        ]
      }
    });

    let autoSubmittedCount = 0;

    for (const user of usersWithDraftForms) {
      // Auto-submit all draft forms for this user
      await prisma.$transaction(async (tx) => {
        await tx.agencyVisit.updateMany({
          where: { agencyId: user.id, status: SubmissionStatus.DRAFT },
          data: { status: SubmissionStatus.SUBMITTED }
        });

        await tx.monthlyCompliance.updateMany({
          where: { userId: user.id, status: SubmissionStatus.DRAFT },
          data: { status: SubmissionStatus.SUBMITTED }
        });

        await tx.assetManagement.updateMany({
          where: { userId: user.id, status: SubmissionStatus.DRAFT },
          data: { status: SubmissionStatus.SUBMITTED }
        });

        // Continue for all other form types...
      });

      autoSubmittedCount++;
    }

    return { 
      success: true, 
      message: `Auto-submitted forms for ${autoSubmittedCount} users` 
    };

  } catch (err) {
    console.error("Error in auto-submission:", err);
    return { error: "Failed to auto-submit forms" };
  }
}

// Approval request actions
export async function submitApprovalRequestAction(
  formType: string,
  formId: string,
  requestType: 'UPDATE_SUBMITTED_FORM' | 'UPDATE_PREVIOUS_MONTH' | 'DELETE_RECORD',
  reason: string,
  documentPath?: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        userId: session.user.id,
        formType,
        formId,
        requestType,
        reason,
        documentPath,
      },
    });

    revalidatePath("/profile");
    return { success: true, requestId: approvalRequest.id };

  } catch (err) {
    console.error("Error submitting approval request:", err);
    return { error: "Failed to submit approval request" };
  }
}