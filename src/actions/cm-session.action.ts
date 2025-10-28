"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, NotificationType, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";

// Store temporary CM sessions in memory (in production, use Redis or similar)
const cmSessionStore = new Map<string, {
  cmUserId: string;
  cmName: string;
  cmEmail: string;
  cmDesignation: string;
  productTag: string;
  agencyUserId: string;
  agencyName: string;
  loginTime: Date;
  ipAddress: string;
}>();

// Session expires after 15 minutes of inactivity
const CM_SESSION_TIMEOUT = 15 * 60 * 1000;

interface CMLoginInput {
  email: string;
  password: string;
  productTag: string;
}

interface CMApprovalInput {
  cmSessionId: string;
  formType: string;
  formId: string;
  rowId: string;
  fieldToUpdate: string;
  remarks?: string;
}

/**
 * Collection Manager login on agency session
 */
export async function cmLoginOnAgencySessionAction(input: CMLoginInput) {
  const headersList = await headers();
  const agencySession = await auth.api.getSession({ headers: headersList });

  // Must be called from an active agency (USER) session
  if (!agencySession || agencySession.user.role !== UserRole.USER) {
    return { error: "This action can only be performed on an active agency session" };
  }

  try {
    // Verify CM credentials
    const cmUser = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        accounts: true
      }
    });

    if (!cmUser || cmUser.role !== UserRole.COLLECTION_MANAGER) {
      return { error: "Invalid Collection Manager credentials" };
    }

    // Verify password using better-auth
    let isValidPassword = false;
    try {
      await auth.api.signInEmail({
        body: {
          email: input.email,
          password: input.password
        }
      });
      isValidPassword = true;
    } catch {
      return { error: "Invalid email or password" };
    }

    if (!isValidPassword) {
      return { error: "Invalid password" };
    }

    // Get IP address
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : "unknown";

    // Create temporary CM session
    const sessionId = `cm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    cmSessionStore.set(sessionId, {
      cmUserId: cmUser.id,
      cmName: cmUser.name,
      cmEmail: cmUser.email,
      cmDesignation: "Collection Manager", // You can add this to user profile
      productTag: input.productTag,
      agencyUserId: agencySession.user.id,
      agencyName: agencySession.user.name,
      loginTime: new Date(),
      ipAddress
    });

    // Log the CM login activity
    await logFormActivityAction({
      action: ActivityAction.USER_LOGIN,
      entityType: "cm_session",
      description: `Collection Manager ${cmUser.name} logged in on agency ${agencySession.user.name}'s session`,
      metadata: {
        cmUserId: cmUser.id,
        cmName: cmUser.name,
        cmEmail: cmUser.email,
        productTag: input.productTag,
        agencyUserId: agencySession.user.id,
        agencyName: agencySession.user.name,
        ipAddress,
        sessionId
      }
    });

    // Notify both CM and Agency
    await createNotificationAction(
      cmUser.id,
      NotificationType.SYSTEM_ALERT,
      "Login on Agency Session",
      `You logged in on ${agencySession.user.name}'s session for ${input.productTag}`,
      undefined,
      sessionId,
      "cm_session"
    );

    await createNotificationAction(
      agencySession.user.id,
      NotificationType.SYSTEM_ALERT,
      "Collection Manager Login",
      `${cmUser.name} logged in to approve records`,
      undefined,
      sessionId,
      "cm_session"
    );

    // Auto-logout after timeout
    setTimeout(() => {
      if (cmSessionStore.has(sessionId)) {
        cmSessionStore.delete(sessionId);
      }
    }, CM_SESSION_TIMEOUT);

    return {
      success: true,
      sessionId,
      cmName: cmUser.name,
      cmEmail: cmUser.email,
      productTag: input.productTag,
      expiresIn: CM_SESSION_TIMEOUT / 1000 / 60 // in minutes
    };
  } catch (error) {
    console.error("Error in CM login:", error);
    return { error: "Failed to authenticate Collection Manager" };
  }
}

/**
 * Collection Manager logout from agency session
 */
export async function cmLogoutFromAgencySessionAction(sessionId: string) {
  const headersList = await headers();
  const agencySession = await auth.api.getSession({ headers: headersList });

  if (!agencySession) {
    return { error: "No active agency session" };
  }

  const cmSession = cmSessionStore.get(sessionId);
  
  if (!cmSession) {
    return { error: "Invalid or expired CM session" };
  }

  // Verify this logout is from the correct agency session
  if (cmSession.agencyUserId !== agencySession.user.id) {
    return { error: "Session mismatch" };
  }

  // Log the logout
  await logFormActivityAction({
    action: ActivityAction.USER_LOGOUT,
    entityType: "cm_session",
    description: `Collection Manager ${cmSession.cmName} logged out from agency ${cmSession.agencyName}'s session`,
    metadata: {
      cmUserId: cmSession.cmUserId,
      cmName: cmSession.cmName,
      agencyUserId: cmSession.agencyUserId,
      agencyName: cmSession.agencyName,
      sessionDuration: Date.now() - cmSession.loginTime.getTime(),
      sessionId
    }
  });

  // Remove session
  cmSessionStore.delete(sessionId);

  return { success: true };
}

/**
 * Process approval with active CM session
 */
export async function cmApproveWithSessionAction(input: CMApprovalInput) {
  const headersList = await headers();
  const agencySession = await auth.api.getSession({ headers: headersList });

  if (!agencySession || agencySession.user.role !== UserRole.USER) {
    return { error: "Must be called from active agency session" };
  }

  // Verify CM session exists and is valid
  const cmSession = cmSessionStore.get(input.cmSessionId);
  
  if (!cmSession) {
    return { error: "Collection Manager session expired. Please login again." };
  }

  // Verify the CM session belongs to this agency session
  if (cmSession.agencyUserId !== agencySession.user.id) {
    return { error: "Session mismatch. Invalid approval attempt." };
  }

  // Check session timeout
  const sessionAge = Date.now() - cmSession.loginTime.getTime();
  if (sessionAge > CM_SESSION_TIMEOUT) {
    cmSessionStore.delete(input.cmSessionId);
    return { error: "Collection Manager session has expired. Please login again." };
  }

  try {
    const timestamp = new Date().toISOString();
    const approvalSignature = `Approved by ${cmSession.cmName} (${cmSession.cmEmail}) - ${cmSession.cmDesignation} - ${cmSession.productTag} - ${timestamp}`;

    // Get IP address
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : null;
    const userAgent = headersList.get("user-agent");

    // Log the approval
    await logFormActivityAction({
      action: ActivityAction.FORM_UPDATED,
      entityType: input.formType,
      description: `Collection Manager ${cmSession.cmName} approved row in ${input.formType}`,
      entityId: input.formId,
      metadata: {
        rowId: input.rowId,
        cmUserId: cmSession.cmUserId,
        cmName: cmSession.cmName,
        cmEmail: cmSession.cmEmail,
        cmDesignation: cmSession.cmDesignation,
        productTag: cmSession.productTag,
        remarks: input.remarks,
        approvalTimestamp: timestamp,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        fieldUpdated: input.fieldToUpdate,
        cmSessionId: input.cmSessionId,
        agencyUserId: agencySession.user.id,
        agencyName: agencySession.user.name
      }
    });

    // Update session last activity time
    cmSession.loginTime = new Date();
    cmSessionStore.set(input.cmSessionId, cmSession);

    return {
      success: true,
      approvalSignature,
      timestamp,
      collectionManager: {
        name: cmSession.cmName,
        email: cmSession.cmEmail,
        designation: cmSession.cmDesignation,
        productTag: cmSession.productTag
      }
    };
  } catch (error) {
    console.error("Error processing CM approval:", error);
    return { error: "Failed to process approval" };
  }
}

/**
 * Check if CM session is still active
 */
export async function checkCMSessionAction(sessionId: string) {
  const headersList = await headers();
  const agencySession = await auth.api.getSession({ headers: headersList });

  if (!agencySession) {
    return { active: false, error: "No agency session" };
  }

  const cmSession = cmSessionStore.get(sessionId);
  
  if (!cmSession) {
    return { active: false, error: "CM session not found" };
  }

  if (cmSession.agencyUserId !== agencySession.user.id) {
    return { active: false, error: "Session mismatch" };
  }

  const sessionAge = Date.now() - cmSession.loginTime.getTime();
  if (sessionAge > CM_SESSION_TIMEOUT) {
    cmSessionStore.delete(sessionId);
    return { active: false, error: "Session expired" };
  }

  const remainingTime = CM_SESSION_TIMEOUT - sessionAge;

  return {
    active: true,
    cmName: cmSession.cmName,
    cmEmail: cmSession.cmEmail,
    productTag: cmSession.productTag,
    remainingMinutes: Math.floor(remainingTime / 1000 / 60)
  };
}

/**
 * Get all active CM sessions for current agency (for display)
 */
export async function getActiveCMSessionsAction() {
  const headersList = await headers();
  const agencySession = await auth.api.getSession({ headers: headersList });

  if (!agencySession || agencySession.user.role !== UserRole.USER) {
    return { error: "Unauthorized" };
  }

  const activeSessions = Array.from(cmSessionStore.entries())
    .filter(([, session]) => session.agencyUserId === agencySession.user.id)
    .map(([sessionId, session]) => ({
      sessionId,
      cmName: session.cmName,
      cmEmail: session.cmEmail,
      productTag: session.productTag,
      loginTime: session.loginTime,
      remainingMinutes: Math.floor((CM_SESSION_TIMEOUT - (Date.now() - session.loginTime.getTime())) / 1000 / 60)
    }));

  return { success: true, sessions: activeSessions };
}