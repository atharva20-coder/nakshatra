"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from "next/headers";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";

export interface CollectionManagerApprovalInput {
  employeeId: string;
  name: string;
  designation: string;
  productTag: string;
  remarks?: string;
  formType: string;
  formId: string;
  rowId: string;
  fieldToUpdate: string; // The field that will store the signature/approval
}

/**
 * Process collection manager approval for a specific row/field in a form
 */
export async function collectionManagerApprovalAction(input: CollectionManagerApprovalInput) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Verify active user session
  if (!session || session.user.role !== 'USER') {
    return { error: "Unauthorized: Only active agency sessions can process approvals" };
  }

  try {
    // Validate required fields
    if (!input.employeeId || !input.name || !input.designation || !input.productTag) {
      return { error: "All collection manager details are required" };
    }

    // Create approval signature with timestamp
    const timestamp = new Date().toISOString();
    const approvalSignature = `Approved by ${input.name} (${input.employeeId}) - ${input.designation} - ${input.productTag} - ${timestamp}`;

    // Get IP address and user agent for security logging
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : null;
    const userAgent = headersList.get("user-agent");

    // Log the approval activity
    await logFormActivityAction({
      action: ActivityAction.FORM_UPDATED,
      entityType: input.formType,
      description: `Collection Manager ${input.name} (${input.employeeId}) approved row in ${input.formType}`,
      entityId: input.formId,
      metadata: {
        rowId: input.rowId,
        collectionManagerName: input.name,
        collectionManagerEmployeeId: input.employeeId,
        collectionManagerDesignation: input.designation,
        productTag: input.productTag,
        remarks: input.remarks,
        approvalTimestamp: timestamp,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        fieldUpdated: input.fieldToUpdate
      }
    });

    // Create notification for the agency user
    await createNotificationAction(
      session.user.id,
      NotificationType.FORM_SUBMITTED,
      "Approval Recorded",
      `Collection Manager ${input.name} has approved a record in your ${input.formType} form`,
      `/user/forms/${input.formType}/${input.formId}`,
      input.formId,
      "form"
    );

    return { 
      success: true, 
      approvalSignature,
      timestamp,
      collectionManager: {
        name: input.name,
        employeeId: input.employeeId,
        designation: input.designation,
        productTag: input.productTag
      }
    };
  } catch (error) {
    console.error("Error processing collection manager approval:", error);
    return { error: "Failed to process approval. Please try again." };
  }
}

/**
 * Get collection manager approval history for a specific form
 */
export async function getCollectionManagerApprovalsAction(formId: string, formType: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const approvals = await prisma.activityLog.findMany({
      where: {
        entityType: formType,
        entityId: formId,
        action: ActivityAction.FORM_UPDATED,
        description: {
          contains: "Collection Manager"
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { success: true, approvals };
  } catch (error) {
    console.error("Error fetching approval history:", error);
    return { error: "Failed to fetch approval history" };
  }
}