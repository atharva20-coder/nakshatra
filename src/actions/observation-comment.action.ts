"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";

/**
 * Add a comment to an observation
 */
export async function addCommentAction(
    observationId: string,
    message: string,
    attachmentPath?: string,
    attachmentName?: string
) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return { error: "Unauthorized" };
    }

    if (!message.trim() && !attachmentPath) {
        return { error: "Message or attachment is required" };
    }

    try {
        const observation = await prisma.observation.findUnique({
            where: { id: observationId },
            include: { audit: true }
        });

        if (!observation) {
            return { error: "Observation not found" };
        }

        // Authorization check
        const isAgency = session.user.role === UserRole.USER;
        const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;

        if (isAgency) {
            if (observation.audit.agencyId !== session.user.id) {
                return { error: "Forbidden: You can only comment on your own observations." };
            }
        } else if (!isAdmin) {
            return { error: "Forbidden" };
        }

        const comment = await prisma.observationComment.create({
            data: {
                observationId,
                userId: session.user.id,
                message: message.trim(),
                attachmentPath,
                attachmentName
            },
            include: {
                user: { select: { name: true, role: true } }
            }
        });

        revalidatePath(`/user/show-cause/${observation.showCauseNoticeId}`);
        revalidatePath(`/admin/show-cause/${observation.showCauseNoticeId}`);

        // Serialize for client component safety
        return { success: true, comment: JSON.parse(JSON.stringify(comment)) };
    } catch (error) {
        return { error: getErrorMessage(error) };
    }
}

/**
 * Get comments for an observation
 */
export async function getCommentsAction(observationId: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return { error: "Unauthorized" };
    }

    try {
        const observation = await prisma.observation.findUnique({
            where: { id: observationId },
            include: { audit: true }
        });

        if (!observation) {
            return { error: "Observation not found" };
        }

        // Authorization check
        const isAgency = session.user.role === UserRole.USER;
        const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;

        if (isAgency && observation.audit.agencyId !== session.user.id) {
            return { error: "Forbidden" };
        } else if (!isAgency && !isAdmin) {
            return { error: "Forbidden" };
        }

        const comments = await prisma.observationComment.findMany({
            where: { observationId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: { select: { name: true, role: true } }
            }
        });

        // Serialize for client component safety
        return { success: true, comments: JSON.parse(JSON.stringify(comments)) };
    } catch (error) {
        return { error: getErrorMessage(error) };
    }
}
