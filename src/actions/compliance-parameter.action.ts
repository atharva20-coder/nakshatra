"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ActivityAction, Prisma } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import { logFormActivityAction } from "@/actions/activity-logging.action";

const SUPER_ADMIN_ROLES = [UserRole.SUPER_ADMIN];

/**
 * Fetches all compliance parameters (active and inactive) for management.
 * Super Admin only.
 */
export async function getAllComplianceParametersAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !SUPER_ADMIN_ROLES.includes(UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  try {
    const parameters = await prisma.complianceParameter.findMany({
      orderBy: { srNo: "asc" },
    });
    return { success: true, parameters };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

interface ParameterInput {
  parameter: string;
  category: string;
}

/**
 * Creates a new compliance parameter.
 * Super Admin only.
 */
export async function createComplianceParameterAction(data: ParameterInput) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !SUPER_ADMIN_ROLES.includes(UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  if (!data.parameter) {
    return { error: "Parameter text cannot be empty." };
  }

  try {
    // Get the highest current srNo
    const lastParam = await prisma.complianceParameter.findFirst({
      orderBy: { srNo: "desc" },
      select: { srNo: true },
    });
    
    const newSrNo = (lastParam?.srNo || 0) + 1;

    const newParameter = await prisma.complianceParameter.create({
      data: {
        srNo: newSrNo,
        parameter: data.parameter,
        category: data.category || "General",
        isActive: true, // New parameters default to active
      },
    });
    
    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: 'ComplianceParameter',
      entityId: newParameter.id,
      description: `Super Admin created new compliance parameter: "${data.parameter}"`,
      metadata: { ...data, srNo: newSrNo }
    });

    revalidatePath("/super/compliance-parameters");
    revalidatePath("/user/forms/monthlyCompliance"); // Refresh for users
    return { success: true, parameter: newParameter };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

interface ParameterUpdateInput extends ParameterInput {
  id: string;
  isActive: boolean;
}

/**
 * Updates an existing compliance parameter.
 * Super Admin only.
 */
export async function updateComplianceParameterAction(data: ParameterUpdateInput) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !SUPER_ADMIN_ROLES.includes(UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  if (!data.parameter) {
    return { error: "Parameter text cannot be empty." };
  }

  try {
    const updatedParameter = await prisma.complianceParameter.update({
      where: { id: data.id },
      data: {
        parameter: data.parameter,
        category: data.category || "General",
        isActive: data.isActive,
      },
    });
    
    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: 'ComplianceParameter',
      entityId: updatedParameter.id,
      description: `Super Admin updated compliance parameter: "${data.parameter}"`,
      metadata: { ...data }
    });
    
    revalidatePath("/super/compliance-parameters");
    revalidatePath("/user/forms/monthlyCompliance"); // Refresh for users
    return { success: true, parameter: updatedParameter };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Deletes a compliance parameter.
 * Super Admin only.
 * This will only succeed if no ComplianceResponse records are linked to it.
 */
export async function deleteComplianceParameterAction(id: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !SUPER_ADMIN_ROLES.includes(UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }
  
  try {
    // Check if any responses are linked to this parameter
    const responseCount = await prisma.complianceResponse.count({
      where: { parameterId: id }
    });
    
    if (responseCount > 0) {
      return { error: `Cannot delete. This parameter is linked to ${responseCount} existing form responses. Please "Deactivate" it instead.` };
    }
    
    const deletedParameter = await prisma.complianceParameter.delete({
      where: { id: id }
    });

    // Re-order all subsequent parameters
    const subsequentParams = await prisma.complianceParameter.findMany({
      where: { srNo: { gt: deletedParameter.srNo } },
      orderBy: { srNo: 'asc' }
    });
    
    // Update subsequent srNo in a transaction
    await prisma.$transaction(
      subsequentParams.map((param, index) =>
        prisma.complianceParameter.update({
          where: { id: param.id },
          data: { srNo: deletedParameter.srNo + index }
        })
      )
    );

    await logFormActivityAction({
      action: ActivityAction.FORM_DELETED, // Re-using this action
      entityType: 'ComplianceParameter',
      entityId: id,
      description: `Super Admin deleted compliance parameter: "${deletedParameter.parameter}"`,
      metadata: { id, parameter: deletedParameter.parameter }
    });

    revalidatePath("/super/compliance-parameters");
    revalidatePath("/user/forms/monthlyCompliance"); // Refresh for users
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      // Foreign key constraint failed
      return { error: "Cannot delete. This parameter is linked to existing form responses. Please 'Deactivate' it instead." };
    }
    return { error: getErrorMessage(error) };
  }
}

/**
 * Re-orders all compliance parameters based on a provided list of IDs.
 * Super Admin only.
 */
export async function reorderComplianceParametersAction(orderedIds: string[]) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !SUPER_ADMIN_ROLES.includes(UserRole.SUPER_ADMIN)) {
    return { error: "Forbidden" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.complianceParameter.update({
          where: { id: orderedIds[i] },
          data: { srNo: i + 1 }, // srNo is 1-based
        });
      }
    });
    
    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: 'ComplianceParameter',
      description: `Super Admin re-ordered ${orderedIds.length} compliance parameters.`,
      metadata: { orderedIdsCount: orderedIds.length }
    });
    
    revalidatePath("/super/compliance-parameters");
    revalidatePath("/user/forms/monthlyCompliance"); // Refresh for users
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}