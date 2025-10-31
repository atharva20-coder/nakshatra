"use server";

// 1. Import 'verify' from 'argon2' instead of 'bcrypt'
import { verify } from "@node-rs/argon2";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction, NotificationType, UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { createNotificationAction } from "@/actions/notification.action"; // Assuming this path
import { logFormActivityAction } from "@/actions/activity-logging.action"; // Assuming this path
import {
  createCMSession,
  getCMSession,
  updateCMSessionActivity,
  deleteCMSession,
  getAgencyCMSessions,
  generateSessionId,
  CM_SESSION_TIMEOUT
} from "@/lib/cm-session-store";

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
 * IMPORTANT: This does NOT change the agency user's session
 */
export async function cmLoginOnAgencySessionAction(input: CMLoginInput) {
  const headersList = await headers();
  const agencySession = await auth.api.getSession({ headers: headersList });

  // Must be called from an active agency (USER) session
  if (!agencySession || agencySession.user.role !== UserRole.USER) {
    return { error: "This action can only be performed on an active agency session" };
  }

  try {
    // 2. Reverted to querying 'accounts' relation for password
    const cmUser = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        accounts: {
          where: {
            providerId: "credential"
          }
        }
      }
    });

    if (!cmUser || cmUser.role !== UserRole.COLLECTION_MANAGER) {
      return { error: "Invalid Collection Manager credentials" };
    }

    // Find the credential account from the included relation
    const credentialAccount = cmUser.accounts.find(acc => acc.providerId === "credential");
    
    // Check for password on the associated account model
    if (!credentialAccount || !credentialAccount.password) {
      return { error: "Invalid credentials setup" };
    }

    // 3. Use argon2.verify(hash, plaintext)
    // Note: The argument order is DIFFERENT from bcrypt.compare(plaintext, hash)
    const isValidPassword = await verify(credentialAccount.password, input.password);

    if (!isValidPassword) {
      return { error: "Invalid email or password" };
    }

    // --- End of Fixes ---

    // Get IP address
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : "unknown";

    // Create temporary CM session (completely separate from agency session)
    const sessionId = generateSessionId();
    
    createCMSession(sessionId, {
      cmUserId: cmUser.id,
      cmName: cmUser.name,
      cmEmail: cmUser.email,
      cmDesignation: "Collection Manager",
      productTag: input.productTag,
      agencyUserId: agencySession.user.id,
      agencyName: agencySession.user.name,
      loginTime: new Date(),
      lastActivity: new Date(),
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
        sessionId,
        note: "This is a temporary CM session - does not affect agency session"
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

  const cmSession = getCMSession(sessionId);
  
  if (!cmSession) {
    return { error: "Invalid or expired CM session" };
  }

  // Verify this logout is from the correct agency session
  if (cmSession.agencyUserId !== agencySession.user.id) {
    return { error: "Session mismatch" };
  }

  // Calculate session duration
  const sessionDuration = Date.now() - cmSession.loginTime.getTime();
  const durationMinutes = Math.floor(sessionDuration / 1000 / 60);

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
      sessionDuration: sessionDuration,
      sessionDurationMinutes: durationMinutes,
      sessionId,
      logoutType: "manual"
    }
  });

  // Notify both parties
  await createNotificationAction(
    cmSession.cmUserId,
    NotificationType.SYSTEM_ALERT,
    "Logged Out",
    `You logged out from ${cmSession.agencyName}'s session after ${durationMinutes} minutes`,
    undefined,
    sessionId,
    "cm_session"
  );

  await createNotificationAction(
    agencySession.user.id,
    NotificationType.SYSTEM_ALERT,
    "Collection Manager Logged Out",
    `${cmSession.cmName} logged out`,
    undefined,
    sessionId,
    "cm_session"
  );

  // Remove session
  const deleted = deleteCMSession(sessionId);

  return { 
    success: deleted,
    message: deleted ? "Logged out successfully" : "Session already expired",
    sessionDuration: durationMinutes
  };
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
  const cmSession = getCMSession(input.cmSessionId);
  
  if (!cmSession) {
    return { error: "Collection Manager session expired. Please login again." };
  }

  // Verify the CM session belongs to this agency session
  if (cmSession.agencyUserId !== agencySession.user.id) {
    return { error: "Session mismatch. Invalid approval attempt." };
  }

  try {
    const timestamp = new Date().toISOString();
    const approvalSignature = `Approved by ${cmSession.cmName} (${cmSession.cmEmail}) - ${cmSession.cmDesignation} - ${cmSession.productTag} - ${timestamp}`;

    // Get IP address
    const header = headersList.get("x-forwarded-for");
    const ipAddress = header ? header.split(",")[0].trim() : null;
    const userAgent = headersList.get("user-agent");

    // === FIX: Get CM Profile ID ===
    const cmProfile = await prisma.collectionManagerProfile.findUnique({
      where: { userId: cmSession.cmUserId }
    });

    if (!cmProfile) {
      return { error: "Collection Manager profile not found" };
    }

    // === FIX: Create CMApproval record ===
    await prisma.cMApproval.create({
      data: {
        cmProfileId: cmProfile.id,
        agencyId: agencySession.user.id,
        formType: input.formType,
        formId: input.formId,
        rowId: input.rowId,
        approvalSignature: approvalSignature,
        productTag: cmSession.productTag,
        remarks: input.remarks || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        reportedToSupervisor: false // Can be updated later if needed
      }
    });

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

    // Update session last activity time (extends session)
    updateCMSessionActivity(input.cmSessionId);

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

  const cmSession = getCMSession(sessionId);
  
  if (!cmSession) {
    return { active: false, error: "CM session not found or expired" };
  }

  if (cmSession.agencyUserId !== agencySession.user.id) {
    return { active: false, error: "Session mismatch" };
  }

  // Calculate remaining time
  const sessionAge = Date.now() - cmSession.lastActivity.getTime();
  const remainingTime = CM_SESSION_TIMEOUT - sessionAge;
  const remainingMinutes = Math.floor(remainingTime / 1000 / 60);

  return {
    active: true,
    cmName: cmSession.cmName,
    cmEmail: cmSession.cmEmail,
    productTag: cmSession.productTag,
    remainingMinutes: remainingMinutes > 0 ? remainingMinutes : 0
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

  const activeSessions = getAgencyCMSessions(agencySession.user.id)
    .map(({ sessionId, data }) => {
      const sessionAge = Date.now() - data.lastActivity.getTime();
      const remainingTime = CM_SESSION_TIMEOUT - sessionAge;
      
      return {
        sessionId,
        cmName: data.cmName,
        cmEmail: data.cmEmail,
        productTag: data.productTag,
        loginTime: data.loginTime,
        lastActivity: data.lastActivity,
        remainingMinutes: Math.floor(remainingTime / 1000 / 60)
      };
    })
    .filter(session => session.remainingMinutes > 0); // Only return active sessions

  return { success: true, sessions: activeSessions };
}

