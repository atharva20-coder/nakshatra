"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ActivityAction, Prisma } from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/argon2";
import { logFormActivityAction } from "@/actions/activity-logging.action";
import { getErrorMessage } from "@/lib/utils";

interface CreateAuditingFirmData {
  firmName: string;
  auditorName: string; // This is the "key person"
  auditorEmail: string;
  auditorPassword: string;
  contactPhone?: string; // This field exists in your schema
  address?: string;      // This field exists in your schema
}

/**
 * Super Admin: Create a new Auditing Firm with Key Person
 */
export async function createAuditingFirmAction(data: CreateAuditingFirmData) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden: Only Super Admins can create auditing firms" };
  }

  try {
    // Validate required fields
    if (!data.firmName || !data.auditorName || !data.auditorEmail || !data.auditorPassword) {
      return { error: "Please fill in all required fields" };
    }
    
    if (data.auditorPassword.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.auditorEmail }
    });

    if (existingUser) {
      return { error: "This email is already registered in the system" };
    }

    // Check if firm name already exists
    const existingFirm = await prisma.auditingFirm.findUnique({
      where: { name: data.firmName }
    });

    if (existingFirm) {
      return { error: "An auditing firm with this name already exists" };
    }

    // Hash the password
    const hashedPassword = await hashPassword(data.auditorPassword);

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Auditing Firm
      const firm = await tx.auditingFirm.create({
        data: {
          name: data.firmName,
          // These fields are in your schema
          contactPerson: data.auditorName,
          contactEmail: data.auditorEmail,
          contactPhone: data.contactPhone || null,
          address: data.address || null,
        }
      });

      // 2. Create the User account for the key person
      const user = await tx.user.create({
        data: {
          name: data.auditorName,
          email: data.auditorEmail,
          emailVerified: true, // Auto-verify since Super Admin is creating this
          role: UserRole.AUDITOR,
        }
      });

      // 3. Create the Account with password
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        }
      });

      // 4. Link the User to the Auditing Firm via Auditor table
      const auditor = await tx.auditor.create({
        data: {
          userId: user.id,
          firmId: firm.id,
        }
      });

      return { firm, user, auditor };
    },
    // --- ADD THIS OPTIONS OBJECT ---
    {
      timeout: 15000, // Set timeout to 15 seconds (15000 ms)
    }
    // --- END OF MODIFICATION ---
    );

    // Log the activity
    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: "AuditingFirm",
      entityId: result.firm.id,
      description: `Super Admin created new auditing firm: ${result.firm.name} with key person: ${result.user.name}`,
      metadata: {
        firmId: result.firm.id,
        firmName: result.firm.name,
        auditorUserId: result.user.id,
        auditorName: result.user.name,
        auditorEmail: result.user.email,
      }
    });

    revalidatePath("/super/auditing-firms");
    revalidatePath("/super/dashboard");

    return { 
      success: true, 
      firm: result.firm,
      auditor: result.user,
      message: "Auditing firm registered successfully" 
    };

  } catch (error) {
    console.error("Error creating auditing firm:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       if (error.code === 'P2002' && error.meta?.target === 'users_email_key') {
        return { error: "An account with this email already exists." };
      }
      if (error.code === 'P2002' && error.meta?.target === 'auditing_firms_name_key') {
        return { error: "An auditing firm with this name already exists." };
      }
    }
    return { error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Get all auditing firms with their key persons
 */
export async function getAllAuditingFirmsAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const firms = await prisma.auditingFirm.findMany({
      include: {
        auditors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              }
            }
          }
        },
        _count: {
          select: {
            agencyAssignments: { where: { isActive: true } },
            audits: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, firms };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Get details of a specific auditing firm
 */
export async function getAuditingFirmDetailsAction(firmId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const firm = await prisma.auditingFirm.findUnique({
      where: { id: firmId },
      include: {
        auditors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                createdAt: true,
              }
            }
          }
        },
        agencyAssignments: {
          where: { isActive: true },
          include: {
            agency: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        audits: {
          include: {
            agency: {
              select: {
                name: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!firm) {
      return { error: "Auditing firm not found" };
    }

    return { success: true, firm };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Update auditing firm details
 */
export async function updateAuditingFirmAction(
  firmId: string,
  data: {
    firmName: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone?: string;
    address?: string;
  }
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    // Check if firm name is being changed and if it already exists
    if (data.firmName) {
      const existingFirm = await prisma.auditingFirm.findFirst({
        where: {
          name: data.firmName,
          id: { not: firmId }
        }
      });

      if (existingFirm) {
        return { error: "An auditing firm with this name already exists" };
      }
    }

    const updatedFirm = await prisma.auditingFirm.update({
      where: { id: firmId },
      data: {
        name: data.firmName,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        address: data.address || null,
      }
    });

    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: "AuditingFirm",
      entityId: updatedFirm.id,
      description: `Super Admin updated auditing firm: ${updatedFirm.name}`,
      metadata: data
    });

    revalidatePath(`/super/auditing-firms/${firmId}`);
    revalidatePath("/super/auditing-firms");

    return { success: true, firm: updatedFirm };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

/**
 * Super Admin: Delete auditing firm (only if no active assignments/audits)
 */
export async function deleteAuditingFirmAction(firmId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    // Check for active assignments
    const activeAssignments = await prisma.agencyAssignment.count({
      where: { firmId, isActive: true }
    });

    if (activeAssignments > 0) {
      return { error: "Cannot delete firm with active agency assignments" };
    }

    // Check for audits
    const auditCount = await prisma.audit.count({
      where: { firmId }
    });

    if (auditCount > 0) {
      return { error: "Cannot delete firm with existing audit records" };
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Get auditors
      const auditors = await tx.auditor.findMany({
        where: { firmId },
        include: { user: true }
      });

      // Delete auditor records
      await tx.auditor.deleteMany({
        where: { firmId }
      });

      // Delete user accounts
      for (const auditor of auditors) {
        await tx.account.deleteMany({
          where: { userId: auditor.userId }
        });
        await tx.user.delete({
          where: { id: auditor.userId }
        });
      }

      // Delete firm
      await tx.auditingFirm.delete({
        where: { id: firmId }
      });
    });

    await logFormActivityAction({
      action: ActivityAction.SETTINGS_CHANGED,
      entityType: "AuditingFirm",
      entityId: firmId,
      description: `Super Admin deleted auditing firm`,
      metadata: { firmId }
    });

    revalidatePath("/super/auditing-firms");

    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}