/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalType, ApprovalStatus, UserRole, SubmissionStatus } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export interface CreateApprovalRequestInput {
  formType: string;
  formId: string;
  requestType: ApprovalType;
  reason: string;
  documentPath?: string;
}

// Map form types to their Prisma model names
const FORM_MODEL_MAP: Record<string, string> = {
  agencyVisits: 'agencyVisit',
  assetManagement: 'assetManagement',
  codeOfConduct: 'codeOfConduct',
  declarationCumUndertaking: 'declarationCumUndertaking',
  monthlyCompliance: 'monthlyCompliance',
  telephoneDeclaration: 'telephoneDeclaration',
  manpowerRegister: 'agencyManpowerRegister',
  productDeclaration: 'productDeclaration',
  agencyPenaltyMatrix: 'agencyPenaltyMatrix',
  agencyTrainingTracker: 'agencyTrainingTracker',
  proactiveEscalationTracker: 'proactiveEscalationTracker',
  escalationDetails: 'escalationDetails',
  paymentRegister: 'paymentRegister',
  repoKitTracker: 'repoKitTracker',
};

/**
 * Update form status to DRAFT when approval is granted
 */
async function updateFormStatusToDraft(formType: string, formId: string) {
  const modelName = FORM_MODEL_MAP[formType];
  
  if (!modelName) {
    console.error(`Unknown form type: ${formType}`);
    return false;
  }

  try {
    // @ts-expect-error - Dynamic model access
    await prisma[modelName].update({
      where: { id: formId },
      data: { 
        status: SubmissionStatus.DRAFT,
        updatedAt: new Date()
      }
    });
    return true;
  } catch (error) {
    console.error(`Error updating form status for ${formType}:`, error);
    return false;
  }
}

/**
 * Close all APPROVED requests for a form when it's resubmitted
 * This ensures the form locks again after resubmission
 */
async function closeApprovedRequestsForForm(formId: string, formType: string, userId: string) {
  try {
    // Archive all approved requests by updating their status to a "COMPLETED" state
    // We'll mark them with a special admin response to track they were used
    await prisma.approvalRequest.updateMany({
      where: {
        formId: formId,
        formType: formType,
        userId: userId,
        status: ApprovalStatus.APPROVED
      },
      data: {
        adminResponse: "[AUTO] This approval was used - Form has been resubmitted and locked again",
        updatedAt: new Date()
      }
    });
    return true;
  } catch (error) {
    console.error("Error closing approved requests:", error);
    return false;
  }
}

/**
 * Create an approval request for updating a submitted form
 */
export async function createApprovalRequestAction(input: CreateApprovalRequestInput) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    // Check if there's already a pending request for this form
    const existingRequest = await prisma.approvalRequest.findFirst({
      where: {
        userId: session.user.id,
        formId: input.formId,
        formType: input.formType,
        status: ApprovalStatus.PENDING
      }
    });

    if (existingRequest) {
      return { error: "You already have a pending request for this form." };
    }

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        userId: session.user.id,
        formType: input.formType,
        formId: input.formId,
        requestType: input.requestType,
        reason: input.reason,
        documentPath: input.documentPath,
        status: ApprovalStatus.PENDING
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/approvals");
    revalidatePath(`/forms/${input.formType}/${input.formId}`);

    return { success: true, requestId: approvalRequest.id };
  } catch (error) {
    console.error("Error creating approval request:", error);
    return { error: "Failed to create approval request" };
  }
}

/**
 * Get all pending approval requests with filters (Admin only)
 */
export async function getPendingApprovalRequestsAction(filters?: {
  userId?: string;
  formType?: string;
  status?: ApprovalStatus;
  searchQuery?: string;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const where: any = {};

    // Apply filters
    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = ApprovalStatus.PENDING;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.formType) {
      where.formType = filters.formType;
    }

    if (filters?.searchQuery) {
      where.OR = [
        { reason: { contains: filters.searchQuery, mode: 'insensitive' } },
        { user: { name: { contains: filters.searchQuery, mode: 'insensitive' } } },
        { user: { email: { contains: filters.searchQuery, mode: 'insensitive' } } }
      ];
    }

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const totalPending = await prisma.approvalRequest.count({
      where: { status: ApprovalStatus.PENDING }
    });

    return { success: true, requests, totalPending };
  } catch (error) {
    console.error("Error fetching approval requests:", error);
    return { error: "Failed to fetch approval requests" };
  }
}

/**
 * Get approval requests for current user with their history
 */
export async function getMyApprovalRequestsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const requests = await prisma.approvalRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, requests };
  } catch (error) {
    console.error("Error fetching user approval requests:", error);
    return { error: "Failed to fetch your approval requests" };
  }
}

/**
 * Approve or reject an approval request (Admin only)
 * When approved, changes form status back to DRAFT and user can edit
 * When form is resubmitted, it locks again and approval is marked as used
 */
export async function processApprovalRequestAction(
  requestId: string,
  approved: boolean,
  adminResponse?: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden: Only admins can process approval requests" };
  }

  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return { error: "Request not found" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return { error: "This request has already been processed" };
    }

    // If approved, update the form status to DRAFT
    if (approved) {
      const formUpdated = await updateFormStatusToDraft(request.formType, request.formId);
      
      if (!formUpdated) {
        return { error: "Failed to update form status. Please try again." };
      }
    }

    // Update the approval request
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        adminResponse: adminResponse || (
          approved 
            ? "Approved - Form status changed to DRAFT. You can now edit and resubmit. Note: Once you resubmit, the form will lock again and you'll need a new approval for further changes." 
            : "Rejected"
        ),
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    revalidatePath("/admin/approvals");
    revalidatePath("/dashboard");
    revalidatePath(`/forms/${request.formType}/${request.formId}`);

    return { success: true, approved };
  } catch (error) {
    console.error("Error processing approval request:", error);
    return { error: "Failed to process approval request" };
  }
}

/**
 * Handle form resubmission - closes approved requests and locks form
 * This should be called when a form is submitted (moved from DRAFT to SUBMITTED)
 */
export async function handleFormResubmissionAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    // Close all approved requests for this form
    await closeApprovedRequestsForForm(formId, formType, session.user.id);
    
    return { success: true };
  } catch (error) {
    console.error("Error handling form resubmission:", error);
    return { error: "Failed to process form resubmission" };
  }
}

/**
 * Request supporting document from user (Admin only)
 */
export async function requestDocumentAction(
  requestId: string,
  message: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden: Only admins can request documents" };
  }

  try {
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        adminResponse: message,
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    revalidatePath("/admin/approvals");
    revalidatePath("/dashboard");

    return { success: true, message: "Document request sent to user" };
  } catch (error) {
    console.error("Error requesting document:", error);
    return { error: "Failed to request document" };
  }
}

/**
 * Upload supporting document for approval request
 */
export async function uploadSupportingDocumentAction(
  requestId: string,
  documentPath: string
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return { error: "Request not found" };
    }

    if (request.userId !== session.user.id) {
      return { error: "Forbidden: You can only upload documents for your own requests" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return { error: "Cannot upload document for a closed request" };
    }

    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        documentPath,
        adminResponse: request.adminResponse?.includes("document")
          ? null
          : request.adminResponse
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/approvals");

    return { success: true };
  } catch (error) {
    console.error("Error uploading document:", error);
    return { error: "Failed to upload document" };
  }
}

/**
 * Check if user has active approval (APPROVED status) that allows editing
 * Returns null if form is locked (no active approval)
 */
export async function checkFormApprovalStatusAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    // Find the most recent PENDING or APPROVED request
    const pendingRequest = await prisma.approvalRequest.findFirst({
      where: {
        userId: session.user.id,
        formId: formId,
        formType: formType,
        status: ApprovalStatus.PENDING
      },
      orderBy: { createdAt: 'desc' }
    });

    if (pendingRequest) {
      return { 
        success: true, 
        hasRequest: true,
        status: pendingRequest.status,
        requestId: pendingRequest.id,
        adminResponse: pendingRequest.adminResponse,
        documentPath: pendingRequest.documentPath
      };
    }

    // Check for approved request that hasn't been used yet
    const approvedRequest = await prisma.approvalRequest.findFirst({
      where: {
        userId: session.user.id,
        formId: formId,
        formType: formType,
        status: ApprovalStatus.APPROVED,
        adminResponse: {
          not: {
            contains: "[AUTO] This approval was used"
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (approvedRequest) {
      return { 
        success: true, 
        hasRequest: true,
        status: approvedRequest.status,
        requestId: approvedRequest.id,
        adminResponse: approvedRequest.adminResponse,
        documentPath: approvedRequest.documentPath
      };
    }

    return { 
      success: true, 
      hasRequest: false
    };
  } catch (error) {
    console.error("Error checking approval status:", error);
    return { error: "Failed to check approval status" };
  }
}

/**
 * Get approval request history for a specific form
 */
export async function getFormApprovalHistoryAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const history = await prisma.approvalRequest.findMany({
      where: {
        formId: formId,
        formType: formType,
        userId: session.user.id
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, history };
  } catch (error) {
    console.error("Error fetching approval history:", error);
    return { error: "Failed to fetch approval history" };
  }
}

/**
 * Get approval statistics for admin dashboard
 */
export async function getApprovalStatisticsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const [pending, approved, rejected, needingDocument] = await Promise.all([
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.PENDING } }),
      prisma.approvalRequest.count({ 
        where: { 
          status: ApprovalStatus.APPROVED,
          adminResponse: {
            not: {
              contains: "[AUTO] This approval was used"
            }
          }
        } 
      }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.REJECTED } }),
      prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          adminResponse: { not: null },
          documentPath: null
        }
      })
    ]);

    return {
      success: true,
      statistics: {
        pending,
        approved,
        rejected,
        needingDocument
      }
    };
  } catch (error) {
    console.error("Error fetching approval statistics:", error);
    return { error: "Failed to fetch statistics" };
  }
}