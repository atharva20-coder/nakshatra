// src/actions/declaration-cum-undertaking-enhanced.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { SubmissionStatus, ActivityAction, NotificationType } from "@/generated/prisma";
import { headers } from 'next/headers';
import { revalidatePath } from "next/cache";
import { DeclarationCumUndertakingRow } from "@/types/forms";
import { handleFormResubmissionAction } from "@/actions/approval-request.action";
import { createNotificationAction } from "@/actions/notification.action";
import { logFormActivityAction } from "@/actions/activity-logging.action";

type DeclarationInput = Omit<DeclarationCumUndertakingRow, 'id'>[];

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

function getMonthYearFromDate(date: Date) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return {
    month: MONTH_NAMES[month],
    year: year.toString()
  };
}

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let oldData: any = null;
        
        if (formId) {
            existingForm = await prisma.declarationCumUndertaking.findFirst({
                where: { id: formId, userId: userId },
                include: { collectionManagers: true }
            });
            
            // Store old data for comparison
            if (existingForm) {
                oldData = {
                    status: existingForm.status,
                    managersCount: existingForm.collectionManagers.length,
                    managers: existingForm.collectionManagers.map(m => ({
                        name: m.name,
                        employeeId: m.employeeId,
                        signature: m.signature
                    }))
                };
            }
        } else {
            existingForm = await prisma.declarationCumUndertaking.findFirst({
                where: { userId: userId, status: SubmissionStatus.DRAFT },
                include: { collectionManagers: true }
            });
            
            if (existingForm) {
                oldData = {
                    status: existingForm.status,
                    managersCount: existingForm.collectionManagers.length,
                    managers: existingForm.collectionManagers.map(m => ({
                        name: m.name,
                        employeeId: m.employeeId,
                        signature: m.signature
                    }))
                };
            }
        }

        let savedForm;
        let wasResubmission = false;
        let actionType: ActivityAction;
        let actionDescription: string;

        const newData = {
            status: submissionStatus,
            managersCount: rows.length,
            managers: detailsToCreate
        };

        if (existingForm) {
            // Determine if this is a resubmission
            if (existingForm.status === SubmissionStatus.DRAFT && status === "SUBMITTED" && formId) {
                wasResubmission = true;
                actionType = ActivityAction.FORM_RESUBMITTED;
                actionDescription = `Resubmitted Declaration Cum Undertaking after approval`;
            } else if (status === "SUBMITTED") {
                actionType = ActivityAction.FORM_SUBMITTED;
                actionDescription = `Submitted Declaration Cum Undertaking`;
            } else {
                actionType = ActivityAction.FORM_UPDATED;
                actionDescription = `Updated Declaration Cum Undertaking draft`;
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
                include: { collectionManagers: true }
            });
        } else {
            actionType = ActivityAction.FORM_CREATED;
            actionDescription = `Created Declaration Cum Undertaking`;
            
            savedForm = await prisma.declarationCumUndertaking.create({
                data: {
                    userId: userId,
                    status: submissionStatus,
                    collectionManagers: {
                        create: detailsToCreate,
                    }
                },
                include: { collectionManagers: true }
            });
        }

        // Get month and year
        const { month, year } = getMonthYearFromDate(savedForm.createdAt);

        // Log activity with detailed changes
        await logFormActivityAction({
            action: actionType,
            entityType: 'declarationCumUndertaking',
            description: actionDescription,
            entityId: savedForm.id,
            metadata: { 
                status: submissionStatus,
                managersCount: rows.length,
                wasResubmission,
                month,
                year,
                oldValues: oldData,
                newValues: newData
            }
        });

        // If this is a resubmission, close all approved requests
        if (wasResubmission && savedForm.id) {
            await handleFormResubmissionAction(savedForm.id, 'declarationCumUndertaking');
        }

        // Create notification for submission
        if (status === "SUBMITTED") {
            const notificationMessage = wasResubmission
                ? `Your Declaration Cum Undertaking has been resubmitted for ${month} ${year}. The form is now locked.`
                : `Your Declaration Cum Undertaking for ${month} ${year} has been submitted successfully.`;
            
            await createNotificationAction(
                userId,
                wasResubmission ? NotificationType.FORM_LOCKED : NotificationType.FORM_SUBMITTED,
                wasResubmission ? "Form Resubmitted & Locked" : "Form Submitted",
                notificationMessage,
                `/forms/declarationCumUndertaking/${savedForm.id}`,
                savedForm.id,
                "form"
            );
        }

        revalidatePath("/user/dashboard");
        revalidatePath(`/user/forms/declarationCumUndertaking`);
        revalidatePath(`/user/forms/declarationCumUndertaking/${savedForm.id}`);

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

export async function deleteDeclarationCumUndertakingAction(id: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
        return { error: "Unauthorized: you must be logged in" };
    }

    try {
        const form = await prisma.declarationCumUndertaking.findFirst({
            where: {
                id: id,
                userId: session.user.id
            },
            include: { collectionManagers: true }
        });

        if (!form) {
            return { error: "Form not found or you don't have permission to delete it." };
        }

        if (form.status === SubmissionStatus.SUBMITTED) {
            return { error: "Cannot delete a submitted form." };
        }

        const { month, year } = getMonthYearFromDate(form.createdAt);

        await prisma.declarationCumUndertaking.delete({
            where: { id: id }
        });

        await logFormActivityAction({
            action: ActivityAction.FORM_DELETED,
            entityType: 'declarationCumUndertaking',
            description: `Deleted Declaration Cum Undertaking draft`,
            entityId: id,
            metadata: {
                month,
                year,
                managersCount: form.collectionManagers.length
            }
        });

        revalidatePath("/user/dashboard");
        revalidatePath(`/user/forms/declarationCumUndertaking`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting declaration cum undertaking:", error);
        return { error: "An unknown error occurred while deleting the form" };
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