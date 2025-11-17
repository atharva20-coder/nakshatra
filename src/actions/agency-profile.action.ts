// src/actions/agency-profile.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getErrorMessage } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";

/**
 * Agency Profile Type
 */
export interface AgencyProfile {
  id: string;
  vemId: string | null;
  panCard: string | null;
  agencyName: string;
  agencyAddress: string | null;
  proprietorName: string | null;
  contactNo: string | null;
  email: string;
  branches: AgencyBranch[];
}

export interface AgencyBranch {
  id: string;
  branchName: string;
  branchAddress: string;
  branchContact: string | null;
  branchEmail: string | null;
}

/**
 * Get or Create Agency Profile
 */
async function getOrCreateAgencyProfile(userId: string) {
  const existingProfile = await prisma.agencyProfile.findUnique({
    where: { userId: userId },
    include: {
      branches: true,
    },
  });

  if (existingProfile) {
    return existingProfile;
  }

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // Create new profile with defaults
  const newProfile = await prisma.agencyProfile.create({
    data: {
      userId: userId,
      agencyName: user?.name || "Agency Name",
      email: user?.email || "",
    },
    include: {
      branches: true,
    },
  });

  return newProfile;
}

/**
 * Get Agency Profile Action
 */
export async function getAgencyProfileAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== "USER") {
    return { error: "Unauthorized: Only Agency users can access this" };
  }

  try {
    const agencyProfile = await getOrCreateAgencyProfile(session.user.id);

    const profile: AgencyProfile = {
      id: agencyProfile.id,
      vemId: agencyProfile.vemId,
      panCard: agencyProfile.panCard,
      agencyName: agencyProfile.agencyName,
      agencyAddress: agencyProfile.agencyAddress,
      proprietorName: agencyProfile.proprietorName,
      contactNo: agencyProfile.contactNo,
      email: agencyProfile.email,
      branches: agencyProfile.branches.map((branch) => ({
        id: branch.id,
        branchName: branch.branchName,
        branchAddress: branch.branchAddress,
        branchContact: branch.branchContact,
        branchEmail: branch.branchEmail,
      })),
    };

    return { success: true, profile };
  } catch (error) {
    console.error("Error fetching agency profile:", error);
    return { error: "Failed to fetch profile" };
  }
}

/**
 * Update Agency Profile Action
 */
export async function updateAgencyProfileAction(data: {
  vemId?: string;
  panCard?: string;
  agencyName: string;
  agencyAddress?: string;
  proprietorName?: string;
  contactNo?: string;
  email: string;
  branches: Array<{
    id?: string;
    branchName: string;
    branchAddress: string;
    branchContact?: string;
    branchEmail?: string;
  }>;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== "USER") {
    return { error: "Unauthorized: Only Agency users can update their profile" };
  }

  try {
    const agencyProfile = await prisma.agencyProfile.findUnique({
      where: { userId: session.user.id },
      include: { branches: true },
    });

    if (!agencyProfile) {
      return { error: "Profile not found. Please reload the page." };
    }

    // Validate VEM ID uniqueness if it's being changed
    if (data.vemId && data.vemId !== agencyProfile.vemId) {
      const existing = await prisma.agencyProfile.findUnique({
        where: { vemId: data.vemId },
      });
      if (existing && existing.id !== agencyProfile.id) {
        return { error: "VEM ID already in use by another agency." };
      }
    }

    // Validate PAN Card uniqueness if it's being changed
    if (data.panCard && data.panCard !== agencyProfile.panCard) {
      const existing = await prisma.agencyProfile.findUnique({
        where: { panCard: data.panCard },
      });
      if (existing && existing.id !== agencyProfile.id) {
        return { error: "PAN Card number already in use by another agency." };
      }
    }

    // Update profile and branches in a transaction
    await prisma.$transaction(async (tx) => {
      // Update agency profile
      await tx.agencyProfile.update({
        where: { id: agencyProfile.id },
        data: {
          vemId: data.vemId || null,
          panCard: data.panCard || null,
          agencyName: data.agencyName,
          agencyAddress: data.agencyAddress || null,
          proprietorName: data.proprietorName || null,
          contactNo: data.contactNo || null,
          email: data.email,
        },
      });

      // Get existing branch IDs
      const existingBranchIds = agencyProfile.branches.map((b) => b.id);
      const submittedBranchIds = data.branches
        .filter((b) => b.id)
        .map((b) => b.id as string);

      // Delete branches that were removed
      const branchesToDelete = existingBranchIds.filter(
        (id) => !submittedBranchIds.includes(id)
      );
      if (branchesToDelete.length > 0) {
        await tx.agencyBranch.deleteMany({
          where: {
            id: { in: branchesToDelete },
            agencyProfileId: agencyProfile.id,
          },
        });
      }

      // Update or create branches
      for (const branch of data.branches) {
        if (branch.id) {
          // Update existing branch
          await tx.agencyBranch.update({
            where: { id: branch.id },
            data: {
              branchName: branch.branchName,
              branchAddress: branch.branchAddress,
              branchContact: branch.branchContact || null,
              branchEmail: branch.branchEmail || null,
            },
          });
        } else {
          // Create new branch
          await tx.agencyBranch.create({
            data: {
              agencyProfileId: agencyProfile.id,
              branchName: branch.branchName,
              branchAddress: branch.branchAddress,
              branchContact: branch.branchContact || null,
              branchEmail: branch.branchEmail || null,
            },
          });
        }
      }
    });

    revalidatePath("/profile");
    return { success: true, message: "Agency profile updated successfully!" };
  } catch (error) {
    console.error("Error updating agency profile:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "This VEM ID or PAN Card is already in use by another agency." };
    }
    return { error: getErrorMessage(error) };
  }
}