/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalType, ApprovalStatus, UserRole, SubmissionStatus, ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { 
  createNotificationAction, 
  notifyAdminOfApprovalRequestAction,
  notifyUserOfApprovalDecisionAction 
} from "@/actions/notification.action";
import { logActivityAction } from "@/actions/notification.action";

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
 */
async function closeApprovedRequestsForForm(formId: string, formType: string, userId: string) {
  try {
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
 * Create an approval request
 */
export async function createApprovalRequestAction(input: CreateApprovalRequestInput) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
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

    // Log activity
    await logActivityAction(
      ActivityAction.APPROVAL_REQUESTED,
      input.formType,
      `Requested approval to edit ${input.formType}`,
      input.formId,
      { reason: input.reason }
    );

    // Notify admins
    await notifyAdminOfApprovalRequestAction(
      approvalRequest.id,
      session.user.id,
      session.user.name,
      input.formType
    );

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
 * Get all approval requests with filters (Admin only)
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
 * Get approval requests for current user
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
 * Process approval request (Admin only)
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
      where: { id: requestId },
      include: { user: true }
    });

    if (!request) {
      return { error: "Request not found" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return { error: "This request has already been processed" };
    }

    if (approved) {
      // ✅ KEY FIX: Change form status to DRAFT
      const formUpdated = await updateFormStatusToDraft(request.formType, request.formId);
      
      if (!formUpdated) {
        return { error: "Failed to update form status. Please try again." };
      }

      // Log the approval with enhanced details
      await logActivityAction(
        ActivityAction.APPROVAL_GRANTED,
        request.formType,
        `Admin approved edit request - Form unlocked for editing`,
        request.formId,
        { 
          adminResponse, 
          reviewedBy: session.user.name,
          approvedBy: session.user.email,
          previousStatus: 'SUBMITTED',
          newStatus: 'DRAFT'
        }
      );
    } else {
      await logActivityAction(
        ActivityAction.APPROVAL_REJECTED,
        request.formType,
        `Admin rejected edit request`,
        request.formId,
        { adminResponse, reviewedBy: session.user.name }
      );
    }

    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        adminResponse: adminResponse || (
          approved 
            ? "Approved - Form changed to DRAFT. You can now edit and resubmit." 
            : "Rejected"
        ),
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    await notifyUserOfApprovalDecisionAction(
      request.userId,
      approved,
      request.formType,
      request.formId,
      adminResponse
    );

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
 * Handle form resubmission
 */
export async function handleFormResubmissionAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await closeApprovedRequestsForForm(formId, formType, session.user.id);
    
    await logActivityAction(
      ActivityAction.FORM_RESUBMITTED,
      formType,
      `Resubmitted ${formType} - Form is now locked`,
      formId
    );

    await createNotificationAction(
      session.user.id,
      NotificationType.FORM_LOCKED,
      "Form Locked",
      `Your ${formType} has been resubmitted and is now locked. You'll need a new approval to make further changes.`,
      `/forms/${formType}/${formId}`,
      formId,
      "form"
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error handling form resubmission:", error);
    return { error: "Failed to process form resubmission" };
  }
}

/**
 * Request document from user (Admin only)
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
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return { error: "Request not found" };
    }

    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        adminResponse: message,
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    await createNotificationAction(
      request.userId,
      NotificationType.DOCUMENT_REQUESTED,
      "Document Requested",
      message,
      `/forms/${request.formType}/${request.formId}`,
      requestId,
      "approval_request"
    );

    revalidatePath("/admin/approvals");
    revalidatePath("/dashboard");

    return { success: true, message: "Document request sent to user" };
  } catch (error) {
    console.error("Error requesting document:", error);
    return { error: "Failed to request document" };
  }
}

/**
 * Upload supporting document
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

    await logActivityAction(
      ActivityAction.DOCUMENT_UPLOADED,
      request.formType,
      `Uploaded supporting document for approval request`,
      request.formId,
      { documentPath }
    );

    revalidatePath("/dashboard");
    revalidatePath("/admin/approvals");

    return { success: true };
  } catch (error) {
    console.error("Error uploading document:", error);
    return { error: "Failed to upload document" };
  }
}

/**
 * Check form approval status
 */
export async function checkFormApprovalStatusAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
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
 * Get form approval history
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
 * Get approval statistics (Admin only)
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