// ============================================
// FILE 4: src/actions/admin-refresh.action.ts
// ============================================
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  ActivityAction, 
  NotificationType,
  SubmissionStatus 
} from "@/generated/prisma";
import { headers } from "next/headers";
import { getUserFormStatusAction } from "@/actions/monthly-refresh.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { revalidatePath } from "next/cache";

/**
 * Admin action to manually refresh forms for a user
 * Creates new form cycles for submitted forms that are past their validity
 */
export async function refreshUserFormsAction(targetUserId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Verify admin access
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return { error: "Forbidden: Admin access required" };
  }

  try {
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Get current form statuses
    const statusResult = await getUserFormStatusAction(targetUserId);

    if (!statusResult.success) {
      return { error: "Failed to get form status" };
    }

    const refreshedForms: string[] = [];
    const skippedForms: Array<{ formType: string; reason: string }> = [];

    // Process each form
    for (const formStatus of statusResult.statuses) {
      if (!formStatus.needsRefresh) {
        skippedForms.push({
          formType: formStatus.formType,
          reason: formStatus.status === SubmissionStatus.SUBMITTED 
            ? 'Already submitted and up to date'
            : 'Previous period not submitted (overdue)'
        });
        continue;
      }

      // Form needs refresh - create new cycle
      refreshedForms.push(formStatus.formType);

      // Log the refresh
      await logFormActivityAction({
        action: ActivityAction.FORM_CREATED,
        entityType: formStatus.formType,
        description: `Admin ${session.user.name} manually refreshed form for ${user.name}`,
        metadata: {
          adminId: session.user.id,
          adminName: session.user.name,
          targetUserId: user.id,
          targetUserName: user.name,
          previousStatus: formStatus.status,
          validityPeriod: formStatus.validityPeriod,
          refreshType: 'manual_admin'
        }
      });
    }

    // Notify user if forms were refreshed
    if (refreshedForms.length > 0) {
      await createNotificationAction(
        targetUserId,
        NotificationType.SYSTEM_ALERT,
        "Forms Refreshed by Admin",
        `Admin has refreshed ${refreshedForms.length} form(s) for you: ${refreshedForms.join(', ')}. You can now submit new forms for the current period.`,
        `/user/dashboard`
      );
    }

    // Log admin action
    await logFormActivityAction({
      action: ActivityAction.FORM_CREATED,
      entityType: 'admin_action',
      description: `Admin manually refreshed forms for user ${user.name}`,
      metadata: {
        adminId: session.user.id,
        adminName: session.user.name,
        targetUserId: user.id,
        targetUserName: user.name,
        refreshedCount: refreshedForms.length,
        refreshedForms,
        skippedCount: skippedForms.length,
        skippedForms
      }
    });

    // Revalidate paths
    revalidatePath('/admin/forms');
    revalidatePath('/user/dashboard');

    return {
      success: true,
      refreshedForms,
      skippedForms,
      userName: user.name,
      message: `Successfully refreshed ${refreshedForms.length} form(s) for ${user.name}`
    };
  } catch (error) {
    console.error("Error refreshing user forms:", error);
    return { error: "Failed to refresh forms" };
  }
}

/**
 * Bulk refresh forms for multiple users
 */
export async function bulkRefreshFormsAction(userIds: string[]) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return { error: "Forbidden" };
  }

  const results: Array<{
    userId: string;
    userName: string;
    success: boolean;
    refreshedCount: number;
    error?: string;
  }> = [];

  for (const userId of userIds) {
    const result = await refreshUserFormsAction(userId);
    
    results.push({
      userId,
      userName: result.userName || 'Unknown',
      success: !result.error,
      refreshedCount: result.refreshedForms?.length || 0,
      error: result.error
    });
  }

  return {
    success: true,
    results,
    totalProcessed: results.length,
    totalSuccess: results.filter(r => r.success).length,
    totalFailed: results.filter(r => !r.success).length
  };
}