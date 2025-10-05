/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalType, ApprovalStatus, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export interface CreateApprovalRequestInput {
  formType: string;
  formId: string;
  requestType: ApprovalType;
  reason: string;
  documentPath?: string;
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
      where.status = ApprovalStatus.PENDING; // Default to pending only
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
      take: 100 // Limit to 100 most recent for performance
    });

    // Get count of total pending requests
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
 * Approve or reject an approval request (Admin only)
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
    const request = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        adminResponse: adminResponse || (approved ? "Approved" : "Rejected"),
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    revalidatePath("/admin/approvals");
    revalidatePath("/dashboard");
    revalidatePath(`/forms/${request.formType}/${request.formId}`);

    return { success: true };
  } catch (error) {
    console.error("Error processing approval request:", error);
    return { error: "Failed to process approval request" };
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
        // Clear admin response since user has provided requested document
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
 * Check if user has pending or approved request for a specific form
 */
export async function checkFormApprovalStatusAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const request = await prisma.approvalRequest.findFirst({
      where: {
        userId: session.user.id,
        formId: formId,
        formType: formType,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { 
      success: true, 
      hasRequest: !!request,
      status: request?.status,
      requestId: request?.id,
      adminResponse: request?.adminResponse,
      documentPath: request?.documentPath
    };
  } catch (error) {
    console.error("Error checking approval status:", error);
    return { error: "Failed to check approval status" };
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
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.APPROVED } }),
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