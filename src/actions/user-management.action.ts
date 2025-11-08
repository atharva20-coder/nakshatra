"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logFormActivityAction } from "@/actions/activity-logging.action";

export async function setUserActivationStatusAction(userId: string, isBanned: boolean) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // 1. Check for Super Admin privileges
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden: You do not have permission." };
  }

  // 2. Prevent Super Admin from deactivating themselves
  if (session.user.id === userId) {
    return { error: "You cannot deactivate your own account." };
  }

  try {
    // 3. Update the user's `banned` status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        banned: isBanned,
        // Add banReason or banExpires if you implement that logic
      },
    });

    // 4. Terminate all active sessions for that user
    if (isBanned) {
      await prisma.session.deleteMany({
        where: { userId: userId },
      });
    }

    // 5. Log this administrative action
    await logFormActivityAction({
      action: "SETTINGS_CHANGED",
      entityType: "User",
      entityId: userId,
      description: `Super Admin ${isBanned ? 'deactivated' : 'activated'} user: ${updatedUser.name}`,
      metadata: {
        targetUserId: userId,
        targetUserEmail: updatedUser.email,
        isActive: !isBanned,
      },
    });

    // 6. Revalidate the cache for the dashboard
    revalidatePath("/super/dashboard");

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user activation status:", error);
    return { error: "An unknown error occurred." };
  }
}