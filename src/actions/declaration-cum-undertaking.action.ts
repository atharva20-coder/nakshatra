"use server";

import { auth } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { SubmissionStatus, ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from 'next/headers';
import { revalidatePath } from "next/cache";
import { DeclarationCumUndertakingRow } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { logActivityAction, createNotificationAction } from "@/actions/notification.action";

type DeclarationInput = Omit<DeclarationCumUndertakingRow, 'id'>[];

export async function saveDeclarationCumUndertakingAction(
    rows: DeclarationInput,
    status: "DRAFT" | "SUBMITTED",
    formId?: string | null
) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return { error: "Unauthorized: You must be logged in." };
    }

    try {
        const submissionStatus = status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;
        const userId = session.user.id;

        if (!rows || rows.length === 0) {
            return { error: "At least one collection manager is required." };
        }

        // Sanitize the input to match DeclarationCollectionManager model
        const detailsToCreate = rows.map(row => ({
            name: row.collectionManagerName,
            employeeId: row.collectionManagerEmployeeId,
            signature: row.collectionManagerSignature
        }));

        let existingForm = null;
        if (formId) {
            existingForm = await prisma.declarationCumUndertaking.findFirst({
                where: { id: formId, userId: userId },
            });
        } else {
            // Find an existing draft to update
            existingForm = await prisma.declarationCumUndertaking.findFirst({
                where: { userId: userId, status: SubmissionStatus.DRAFT },
            });
        }

        let savedForm;
        let wasResubmission = false;
        let actionType: ActivityAction;

        if (existingForm) {
            // Check if this is a resubmission (DRAFT -> SUBMITTED for a form that was previously submitted)
            if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED" && formId) {
                wasResubmission = true;
                actionType = ActivityAction.FORM_RESUBMITTED;
            } else if (status === "SUBMITTED") {
                actionType = ActivityAction.FORM_SUBMITTED;
            } else {
                actionType = ActivityAction.FORM_UPDATED;
            }

            // Don't allow editing of truly submitted forms (those without active approval)
            if (existingForm.status === SubmissionStatus.SUBMITTED && !formId) {
                return { error: "Cannot edit a submitted form without approval." };
            }

            savedForm = await prisma.declarationCumUndertaking.update({
                where: { id: existingForm.id },
                data: {
                    status: submissionStatus,
                    collectionManagers: {
                        deleteMany: {},
                        create: detailsToCreate,
                    }
                },
            });
        } else {
            actionType = ActivityAction.FORM_CREATED;
            savedForm = await prisma.declarationCumUndertaking.create({
                data: {
                    userId: userId,
                    status: submissionStatus,
                    collectionManagers: {
                        create: detailsToCreate,
                    }
                }
            });
        }

        // Log activity
        await logActivityAction(
            actionType,
            'declarationCumUndertaking',
            wasResubmission 
                ? `Resubmitted Declaration Cum Undertaking - Form locked again`
                : status === "SUBMITTED" 
                    ? `Submitted Declaration Cum Undertaking`
                    : `${existingForm ? 'Updated' : 'Created'} Declaration Cum Undertaking draft`,
            savedForm.id,
            { 
                status: submissionStatus, 
                managersCount: rows.length,
                wasResubmission 
            }
        );

        // If this is a resubmission, close all approved requests
        if (wasResubmission && savedForm.id) {
            await handleFormResubmissionAction(savedForm.id, 'declarationCumUndertaking');
        }

        // Create notification for submission
        if (status === "SUBMITTED" && !wasResubmission) {
            await createNotificationAction(
                userId,
                NotificationType.FORM_SUBMITTED,
                "Form Submitted",
                `Your Declaration Cum Undertaking has been submitted successfully.`,
                `/forms/declarationCumUndertaking/${savedForm.id}`,
                savedForm.id,
                "form"
            );
        }

        revalidatePath("/dashboard");
        revalidatePath(`/forms/declarationCumUndertaking`);
        revalidatePath(`/forms/declarationCumUndertaking/${savedForm.id}`);

        return {
            success: true,
            formId: savedForm.id,
            message: wasResubmission 
                ? "Form resubmitted successfully. It is now locked and you'll need a new approval for further changes." 
                : status === "SUBMITTED" 
                    ? "Form submitted successfully." 
                    : "Draft saved successfully."
        };
    } catch (err) {
        console.error("Error saving Declaration Cum Undertaking:", err);
        return { error: "An unknown error occurred while saving the form" };
    }
}

export async function getDeclarationById(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return null;
    }

    try {
        const form = await prisma.declarationCumUndertaking.findFirst({
            where: {
                id: id,
                userId: session.user.id
            },
            include: {
                collectionManagers: true
            }
        });

        if (!form) {
            return null;
        }

        // Map database fields to frontend component's expected prop names
        return {
            id: form.id,
            status: form.status,
            details: form.collectionManagers.map(manager => ({
                id: manager.id,
                collectionManagerName: manager.name,
                collectionManagerEmployeeId: manager.employeeId,
                collectionManagerSignature: manager.signature,
            }))
        };
    } catch (error) {
        console.error("Error fetching Declaration Cum Undertaking:", error);
        return null;
    }
}

export async function deleteDeclarationCumUndertakingAction(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return { error: "Unauthorized: you must be logged in" };
    }

    try {
        // First, find the form to verify ownership and check its status
        const form = await prisma.declarationCumUndertaking.findFirst({
            where: {
                id: id,
                userId: session.user.id
            }
        });

        if (!form) {
            return { error: "Form not found or you don't have permission to delete it." };
        }

        if (form.status === SubmissionStatus.SUBMITTED) {
            return { error: "Cannot delete a submitted form." };
        }

        // Now, perform the delete operation
        await prisma.declarationCumUndertaking.delete({
            where: { id: id }
        });

        // Log activity
        await logActivityAction(
            ActivityAction.FORM_DELETED,
            'declarationCumUndertaking',
            `Deleted Declaration Cum Undertaking draft`,
            id
        );

        revalidatePath("/dashboard");
        revalidatePath(`/forms/declarationCumUndertaking`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting declaration cum undertaking:", error);
        return { error: "An unknown error occurred while deleting the form" };
    }
}