// src/actions/collection-manager.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  UserRole, 
  Prisma, 
  CollectionManagerProfile, 
  CMAgencyAssignment, // Import correct type
  CMApproval // Import prisma type
} from "@/generated/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache"; 
import { FORM_CONFIGS, FormType, AgencyTableRow } from "@/types/forms"; 
// Import all the ...ForAdmin actions
import { getAgencyVisitByIdForAdmin } from "@/actions/agency-visit.action";
import { getAssetManagementByIdForAdmin } from "@/actions/asset-management.action";
import { getCodeOfConductByIdForAdmin } from "@/actions/code-of-conduct.action";
import { getDeclarationByIdForAdmin } from "@/actions/declaration-cum-undertaking.action";
import { getManpowerRegisterByIdForAdmin } from "@/actions/manpower-register.action";
import { getPaymentRegisterByIdForAdmin } from "@/actions/payment-register.action";
import { getProactiveEscalationByIdForAdmin } from "@/actions/proactive-escalation.action";
import { getProductDeclarationByIdForAdmin } from "@/actions/product-declaration.action";
import { getRepoKitTrackerByIdForAdmin } from "@/actions/repo-kit-tracker.action";
import { getTelephoneDeclarationByIdForAdmin } from "@/actions/telephone-declaration.action";

// Type-safe response types
interface CMProfile {
  id: string; // This is the Profile ID, not the User ID
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  productAssigned: string;
  supervisorName: string | null;
  supervisorEmail: string | null;
  supervisorEmployeeId: string | null;
  createdAt: Date;
}

interface AgencyBasicInfo {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastSubmissionDate: Date | null;
  totalSubmissions: number;
  pendingForms: number;
}

interface AgencyDetailedInfo extends AgencyBasicInfo {
  recentSubmissions: Array<{
    formType: string;
    formTitle: string;
    submittedAt: Date;
    status: string;
    id: string;
  }>;
  monthlyHistory: Array<{
    month: string;
    year: number;
    totalForms: number;
    submittedForms: number;
    complianceRate: number;
  }>;
}

interface FormStatusByMonth {
  formType: string;
  formTitle: string;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'OVERDUE';
  formId?: string;
  lastUpdated?: Date;
}

// *** HELPER FUNCTION TO GET OR CREATE CM PROFILE ***
/**
 * Finds a CM's profile by their User ID. If it doesn't exist,
 * it creates one and returns it.
 */
async function getOrCreateCMProfile(userId: string): Promise<CollectionManagerProfile> {
  const existingProfile = await prisma.collectionManagerProfile.findUnique({
    where: { userId: userId },
  });

  if (existingProfile) {
    return existingProfile;
  }

  // Profile not found, create one
  const newProfile = await prisma.collectionManagerProfile.create({
    data: {
      userId: userId,
      employeeId: `CM-${userId.substring(0, 8).toUpperCase()}`, // Placeholder
      designation: "Collection Manager", // Default
      productsAssigned: [], // Default
    },
  });

  return newProfile;
}


/**
 * Get Collection Manager Profile
 */
export async function getCMProfileAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized: Only Collection Managers can access this" };
  }

  try {
    // 1. Get or Create the profile
    const cmProfile = await getOrCreateCMProfile(session.user.id);

    // 2. Get Supervisor info if it exists
    let supervisorInfo = null;
    if (cmProfile.supervisorId) {
      supervisorInfo = await prisma.collectionManagerProfile.findUnique({
        where: { id: cmProfile.supervisorId },
        include: { user: { select: { name: true, email: true } } }
      });
    }

    // 3. Format and return the real profile data
    const profile: CMProfile = {
      id: cmProfile.id,
      name: session.user.name,
      email: session.user.email,
      employeeId: cmProfile.employeeId,
      designation: cmProfile.designation,
      productAssigned: cmProfile.productsAssigned.join(", ") || "N/A",
      supervisorName: supervisorInfo?.user.name ?? null,
      supervisorEmail: supervisorInfo?.user.email ?? null,
      supervisorEmployeeId: supervisorInfo?.employeeId ?? null,
      createdAt: cmProfile.createdAt,
    };

    return { success: true, profile };
  } catch (error) {
    console.error("Error fetching CM profile:", error);
    return { error: "Failed to fetch profile" };
  }
}

/**
 * Get list of all agencies for CM dashboard
 */
export async function getCMAgenciesAction(searchQuery?: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  try {
    const whereClause: Prisma.UserWhereInput = {
      role: UserRole.USER,
    };

    if (searchQuery && searchQuery.trim()) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const agencies = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // ... (rest of the stat logic is correct and remains unchanged) ...
    const agenciesWithStats = await Promise.all(
      agencies.map(async (agency) => {
        // Count total submissions across all form types
        const [
          codeOfConductCount,
          declarationCount,
          agencyVisitCount,
          monthlyComplianceCount,
          assetManagementCount,
          telephoneCount,
          manpowerCount,
          productCount,
          penaltyCount,
          trainingCount,
          proactiveCount,
          escalationCount,
          paymentCount,
          repoKitCount,
        ] = await Promise.all([
          prisma.codeOfConduct.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.declarationCumUndertaking.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyVisit.count({ where: { agencyId: agency.id, status: 'SUBMITTED' } }),
          prisma.monthlyCompliance.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.assetManagement.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.telephoneDeclaration.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyManpowerRegister.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.productDeclaration.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyPenaltyMatrix.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyTrainingTracker.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.proactiveEscalationTracker.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.escalationDetails.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.paymentRegister.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.repoKitTracker.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
        ]);

        const totalSubmissions = 
          codeOfConductCount + declarationCount + agencyVisitCount + monthlyComplianceCount +
          assetManagementCount + telephoneCount + manpowerCount + productCount +
          penaltyCount + trainingCount + proactiveCount + escalationCount +
          paymentCount + repoKitCount;

        // Get most recent submission date
        const recentForms = await Promise.all([
          prisma.codeOfConduct.findFirst({ where: { userId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
          prisma.declarationCumUndertaking.findFirst({ where: { userId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
          prisma.agencyVisit.findFirst({ where: { agencyId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
          prisma.monthlyCompliance.findFirst({ where: { userId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
        ]);

        const lastSubmissionDate = recentForms
          .filter((f): f is { updatedAt: Date } => f !== null)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.updatedAt || null;

        // Count pending forms (drafts)
        const pendingForms = await prisma.$transaction([
          prisma.codeOfConduct.count({ where: { userId: agency.id, status: 'DRAFT' } }),
          prisma.declarationCumUndertaking.count({ where: { userId: agency.id, status: 'DRAFT' } }),
          prisma.agencyVisit.count({ where: { agencyId: agency.id, status: 'DRAFT' } }),
          prisma.monthlyCompliance.count({ where: { userId: agency.id, status: 'DRAFT' } }),
        ]);

        const totalPending = pendingForms.reduce((sum, count) => sum + count, 0);

        const agencyInfo: AgencyBasicInfo = {
          id: agency.id,
          name: agency.name,
          email: agency.email,
          createdAt: agency.createdAt,
          lastSubmissionDate,
          totalSubmissions,
          pendingForms: totalPending,
        };

        return agencyInfo;
      })
    );

    return { success: true, agencies: agenciesWithStats };
  } catch (error) {
    console.error("Error fetching agencies:", error);
    return { error: "Failed to fetch agencies" };
  }
}

/**
 * Get detailed information for a specific agency
 */
export async function getCMAgencyDetailAction(agencyId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  try {
    const agency = await prisma.user.findUnique({
      where: { id: agencyId, role: UserRole.USER },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!agency) {
      return { error: "Agency not found" };
    }

    // ... (rest of the logic is correct and remains unchanged) ...
    const recentSubmissions = [];

    // Code of Conduct
    const codeOfConductForms = await prisma.codeOfConduct.findMany({
      where: { userId: agencyId, status: 'SUBMITTED' },
      select: { id: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    recentSubmissions.push(...codeOfConductForms.map(f => ({
      formType: 'codeOfConduct',
      formTitle: 'Code of Conduct',
      submittedAt: f.createdAt,
      status: f.status,
      id: f.id,
    })));

    // Declaration Cum Undertaking
    const declarationForms = await prisma.declarationCumUndertaking.findMany({
      where: { userId: agencyId, status: 'SUBMITTED' },
      select: { id: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    recentSubmissions.push(...declarationForms.map(f => ({
      formType: 'declarationCumUndertaking',
      formTitle: 'Declaration Cum Undertaking',
      submittedAt: f.createdAt,
      status: f.status,
      id: f.id,
    })));

    // Agency Visits
    const agencyVisitForms = await prisma.agencyVisit.findMany({
      where: { agencyId: agencyId, status: 'SUBMITTED' },
      select: { id: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    recentSubmissions.push(...agencyVisitForms.map(f => ({
      formType: 'agencyVisits',
      formTitle: 'Agency Visit Details',
      submittedAt: f.createdAt,
      status: f.status,
      id: f.id,
    })));

    // Sort by date and take top 10
    recentSubmissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    const topRecentSubmissions = recentSubmissions.slice(0, 10);

    // Calculate monthly history (last 6 months)
    const monthlyHistory = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = targetDate.toLocaleString('default', { month: 'long' });
      const year = targetDate.getFullYear();
      
      const startDate = new Date(year, targetDate.getMonth(), 1);
      const endDate = new Date(year, targetDate.getMonth() + 1, 0, 23, 59, 59);

      // Count forms for this month
      const monthForms = await Promise.all([
        prisma.codeOfConduct.count({ where: { userId: agencyId, createdAt: { gte: startDate, lte: endDate } } }),
        prisma.declarationCumUndertaking.count({ where: { userId: agencyId, createdAt: { gte: startDate, lte: endDate } } }),
        prisma.agencyVisit.count({ where: { agencyId: agencyId, createdAt: { gte: startDate, lte: endDate } } }),
        prisma.monthlyCompliance.count({ where: { userId: agencyId, createdAt: { gte: startDate, lte: endDate } } }),
      ]);

      const submittedForms = await Promise.all([
        prisma.codeOfConduct.count({ where: { userId: agencyId, status: 'SUBMITTED', createdAt: { gte: startDate, lte: endDate } } }),
        prisma.declarationCumUndertaking.count({ where: { userId: agencyId, status: 'SUBMITTED', createdAt: { gte: startDate, lte: endDate } } }),
        prisma.agencyVisit.count({ where: { agencyId: agencyId, status: 'SUBMITTED', createdAt: { gte: startDate, lte: endDate } } }),
        prisma.monthlyCompliance.count({ where: { userId: agencyId, status: 'SUBMITTED', createdAt: { gte: startDate, lte: endDate } } }),
      ]);

      const totalForms = monthForms.reduce((sum, count) => sum + count, 0);
      const totalSubmitted = submittedForms.reduce((sum, count) => sum + count, 0);
      const complianceRate = totalForms > 0 ? Math.round((totalSubmitted / totalForms) * 100) : 0;

      monthlyHistory.push({
        month,
        year,
        totalForms,
        submittedForms: totalSubmitted,
        complianceRate,
      });
    }

    // Calculate basic stats
    const totalSubmissions = recentSubmissions.length;
    const lastSubmissionDate = topRecentSubmissions[0]?.submittedAt || null;

    const pendingForms = await Promise.all([
      prisma.codeOfConduct.count({ where: { userId: agencyId, status: 'DRAFT' } }),
      prisma.declarationCumUndertaking.count({ where: { userId: agencyId, status: 'DRAFT' } }),
      prisma.agencyVisit.count({ where: { agencyId: agencyId, status: 'DRAFT' } }),
      prisma.monthlyCompliance.count({ where: { userId: agencyId, status: 'DRAFT' } }),
    ]);
    const totalPending = pendingForms.reduce((sum, count) => sum + count, 0);

    const agencyDetail: AgencyDetailedInfo = {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      createdAt: agency.createdAt,
      lastSubmissionDate,
      totalSubmissions,
      pendingForms: totalPending,
      recentSubmissions: topRecentSubmissions,
      monthlyHistory,
    };

    return { success: true, agency: agencyDetail };
  } catch (error) {
    console.error("Error fetching agency details:", error);
    return { error: "Failed to fetch agency details" };
  }
}

/**
 * Get form status for agency for a specific month
 */
export async function getCMAgencyFormStatusAction(agencyId: string, month: number, year: number) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const now = new Date();

    const formStatuses: Record<string, FormStatusByMonth> = {};

    // Check each major form type
    const formTypes = [
      { key: 'codeOfConduct', title: 'Code of Conduct', model: prisma.codeOfConduct, userField: 'userId', deadlineDay: 5 },
      { key: 'declarationCumUndertaking', title: 'Declaration Cum Undertaking', model: prisma.declarationCumUndertaking, userField: 'userId', deadlineDay: 5 },
      { key: 'agencyVisits', title: 'Agency Visit Details', model: prisma.agencyVisit, userField: 'agencyId', deadlineDay: 5 },
      { key: 'monthlyCompliance', title: 'Monthly Compliance', model: prisma.monthlyCompliance, userField: 'userId', deadlineDay: 5 },
      { key: 'assetManagement', title: 'Asset Management', model: prisma.assetManagement, userField: 'userId', deadlineDay: 5 },
      { key: 'telephoneDeclaration', title: 'Telephone Declaration', model: prisma.telephoneDeclaration, userField: 'userId', deadlineDay: 5 },
    ];

    for (const formType of formTypes) {
      const whereClause = {
        [formType.userField]: agencyId,
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submission = await (formType.model as any).findFirst({
        where: whereClause,
        select: { id: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      });

      const deadline = new Date(year, month - 1, formType.deadlineDay, 23, 59, 59);
      const isOverdue = now > deadline;

      if (!submission) {
        formStatuses[formType.key] = {
          formType: formType.key,
          formTitle: formType.title,
          status: isOverdue ? 'OVERDUE' : 'NOT_STARTED',
        };
      } else if (submission.status === 'SUBMITTED') {
        formStatuses[formType.key] = {
          formType: formType.key,
          formTitle: formType.title,
          status: 'SUBMITTED',
          formId: submission.id,
          lastUpdated: submission.updatedAt,
        };
      } else {
        formStatuses[formType.key] = {
          formType: formType.key,
          formTitle: formType.title,
          status: isOverdue ? 'OVERDUE' : 'DRAFT',
          formId: submission.id,
          lastUpdated: submission.updatedAt,
        };
      }
    }

    return { success: true, formStatuses };
  } catch (error) {
    console.error("Error fetching form status:", error);
    return { error: "Failed to fetch form status" };
  }
}

// *** UPDATED AssignedAgencyInfo INTERFACE ***
export interface AssignedAgencyInfo extends AgencyBasicInfo {
  assignment: {
    id: string; // This is the assignment ID
    assignedAt: Date;
    viewedByAt: Date | null; 
    isActive: boolean; // Added for status
    updatedAt: Date; // Added for end date
  };
}

/**
 * Get list of agencies ASSIGNED to the current CM for their dashboard
 */
export async function getAssignedAgenciesForCMAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Find or create the CM's profile
    const cmProfile = await getOrCreateCMProfile(session.user.id);

    // 2. Find all active and inactive assignments for this CM
    const assignments = await prisma.cMAgencyAssignment.findMany({
      where: {
        cmProfileId: cmProfile.id,
      },
      select: {
        id: true,
        assignedAt: true,
        viewedByAt: true, 
        isActive: true, 
        updatedAt: true, 
        agency: { 
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        agency: { name: 'asc' }
      }
    });

    // 3. Get submission stats for each assigned agency
    const agenciesWithStats = await Promise.all(
      assignments.map(async (assignment) => {
        const { agency } = assignment;

        // ... (submission stat logic remains unchanged) ...
        const submissionCounts = await Promise.all([
          prisma.codeOfConduct.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.declarationCumUndertaking.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyVisit.count({ where: { agencyId: agency.id, status: 'SUBMITTED' } }),
          prisma.monthlyCompliance.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.assetManagement.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.telephoneDeclaration.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyManpowerRegister.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.productDeclaration.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyPenaltyMatrix.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.agencyTrainingTracker.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.proactiveEscalationTracker.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.escalationDetails.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.paymentRegister.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
          prisma.repoKitTracker.count({ where: { userId: agency.id, status: 'SUBMITTED' } }),
        ]);
        const totalSubmissions = submissionCounts.reduce((sum, count) => sum + count, 0);
        
        const recentForms = await Promise.all([
          prisma.codeOfConduct.findFirst({ where: { userId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
          prisma.declarationCumUndertaking.findFirst({ where: { userId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
          prisma.agencyVisit.findFirst({ where: { agencyId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
          prisma.monthlyCompliance.findFirst({ where: { userId: agency.id, status: 'SUBMITTED' }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
        ]);
        
        const lastSubmissionDate = recentForms
          .filter((f): f is { updatedAt: Date } => f !== null)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.updatedAt || null;

        const pendingForms = await Promise.all([
          prisma.codeOfConduct.count({ where: { userId: agency.id, status: 'DRAFT' } }),
          prisma.declarationCumUndertaking.count({ where: { userId: agency.id, status: 'DRAFT' } }),
          prisma.agencyVisit.count({ where: { agencyId: agency.id, status: 'DRAFT' } }),
          prisma.monthlyCompliance.count({ where: { userId: agency.id, status: 'DRAFT' } }),
        ]);
        const totalPending = pendingForms.reduce((sum, count) => sum + count, 0);

        const agencyInfo: AssignedAgencyInfo = {
          id: agency.id,
          name: agency.name,
          email: agency.email,
          createdAt: agency.createdAt,
          lastSubmissionDate,
          totalSubmissions,
          pendingForms: totalPending,
          assignment: {
            id: assignment.id,
            assignedAt: assignment.assignedAt,
            viewedByAt: assignment.viewedByAt,
            isActive: assignment.isActive, 
            updatedAt: assignment.updatedAt, 
          }
        };
        return agencyInfo;
      })
    );

    return { success: true, agencies: agenciesWithStats };
  } catch (error) {
    console.error("Error fetching assigned agencies:", error);
    return { error: "Failed to fetch assigned agencies" };
  }
}

/**
 * Super Admin: Get a summary of all Collection Managers and their agency assignment stats.
 */
export async function getCollectionManagersSummaryAction() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Forbidden" };
  }

  try {
    const managers = await prisma.user.findMany({
      where: { role: UserRole.COLLECTION_MANAGER },
      select: {
        id: true,
        name: true,
        email: true,
        cmProfile: { 
          select: {
            id: true,
            _count: {
              select: { agencyAssignments: { where: { isActive: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Flatten the response
    const managersWithStats = managers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        cmProfileId: m.cmProfile?.id, 
        assignedAgencyCount: m.cmProfile?._count.agencyAssignments ?? 0, 
    }));
    
    return { success: true, managers: managersWithStats };
  } catch (error) {
     console.error("Error fetching CM summary:", error);
    return { error: "Failed to fetch Collection Manager data." };
  }
}

/**
 * Super Admin: Get all agencies and their assignment status for a specific CM.
 */
export async function getCMAssignmentDetailsAction(cmUserId: string) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return { error: "Forbidden" };
    }
    try {
        const cmUser = await prisma.user.findUnique({
            where: { id: cmUserId, role: UserRole.COLLECTION_MANAGER },
            select: { id: true, name: true, email: true, cmProfile: { select: { id: true } } } 
        });

        if (!cmUser || !cmUser.cmProfile) { 
            return { error: "Collection Manager profile not found." };
        }
        
        const cmProfileId = cmUser.cmProfile.id; 

        const allAgencies = await prisma.user.findMany({
            where: { role: UserRole.USER },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });

        const allAssignments = await prisma.cMAgencyAssignment.findMany({ 
            where: { isActive: true },
            include: { cmProfile: { include: { user: { select: { name: true } } } } },
        });

        const agenciesWithStatus = allAgencies.map(agency => {
            const assignment = allAssignments.find((a: CMAgencyAssignment) => a.agencyId === agency.id);
            return {
                ...agency,
                isAssigned: !!assignment,
                isAssignedToCurrentCM: assignment?.cmProfileId === cmProfileId,
                assignedCMName: assignment?.cmProfile.user.name ?? null,
            };
        });
        
        const cmUserData = { id: cmUser.id, name: cmUser.name, email: cmUser.email, cmProfileId: cmProfileId };

        return { success: true, cmUser: cmUserData, agencies: agenciesWithStatus };
    } catch (error) {
        console.error(`Error fetching assignment details for CM ${cmUserId}:`, error);
        return { error: "Failed to fetch assignment details." };
    }
}

/**
 * Super Admin: Update agency assignments for a specific Collection Manager.
 */
export async function updateCMAssignmentsAction(cmUserId: string, assignedAgencyIds: string[], unassignedAgencyIds: string[]) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return { error: "Forbidden" };
    }
    
    try {
         const cmProfile = await prisma.collectionManagerProfile.findUnique({
            where: { userId: cmUserId },
            select: { id: true }
        });
        
        if (!cmProfile) {
            return { error: "Collection Manager profile not found." };
        }
        const cmProfileId = cmProfile.id;

        await prisma.$transaction(async (tx) => {
            // Deactivate assignments
            if (unassignedAgencyIds.length > 0) {
                await tx.cMAgencyAssignment.updateMany({ 
                    where: {
                        cmProfileId: cmProfileId,
                        agencyId: { in: unassignedAgencyIds },
                    },
                    data: { isActive: false, updatedAt: new Date() }, 
                });
            }

            // Create or reactivate assignments
            if (assignedAgencyIds.length > 0) {
                for (const agencyId of assignedAgencyIds) {
                    await tx.cMAgencyAssignment.upsert({ 
                        where: { cmProfileId_agencyId: { cmProfileId, agencyId } },
                        update: { isActive: true, assignedBy: session.user.id, updatedAt: new Date() }, 
                        create: {
                            cmProfileId,
                            agencyId,
                            assignedBy: session.user.id,
                            isActive: true,
                        },
                    });
                }
            }
        });
        
        revalidatePath('/super/cm-assignments'); 
        revalidatePath(`/super/cm-assignments/assign/${cmUserId}`); 

        return { success: true };
    } catch (error) {
        console.error(`Error updating assignments for CM ${cmUserId}:`, error);
        return { error: "Failed to update assignments." };
    }
}

/**
 * CM: Mark new agency assignments as viewed
 */
export async function markCMAssignmentsAsViewedAction(assignmentIds: string[]) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  if (!assignmentIds || assignmentIds.length === 0) {
    return { error: "No assignment IDs provided" };
  }

  try {
    const cmProfile = await getOrCreateCMProfile(session.user.id); 

    const { count } = await prisma.cMAgencyAssignment.updateMany({
      where: {
        id: { in: assignmentIds },
        cmProfileId: cmProfile.id, 
        viewedByAt: null,          
      },
      data: {
        viewedByAt: new Date(),
      }
    });

    revalidatePath("/collectionManager/dashboard");
    return { success: true, count };

  } catch (error) {
    console.error("Error marking assignments as viewed:", error);
    return { error: "Failed to update assignments" };
  }
}

// *** ACTION FOR AGENCY APPROVALS PAGE ***

export interface CMAgencyApproval {
  id: string;
  createdAt: Date;
  formType: string;
  formTitle: string; 
  formId: string;
  rowId: string | null;
  productTag: string;
  remarks: string | null;
}

/**
 * Get all approvals a CM has given for a specific agency
 */
export async function getCMAgencyApprovalsAction(agencyId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Find or create the CM's profile
    const cmProfile = await getOrCreateCMProfile(session.user.id); 

    // 2. Find the agency
    const agency = await prisma.user.findUnique({
      where: { id: agencyId, role: UserRole.USER },
      select: { id: true, name: true, email: true }
    });

    if (!agency) {
      return { error: "Agency not found." };
    }

    // 3. Find all approvals given by this CM to this Agency, but only one per form
    const approvals = await prisma.cMApproval.findMany({
      where: {
        cmProfileId: cmProfile.id,
        agencyId: agency.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      distinct: ['formId', 'formType']
    });

    // 4. Format approvals with user-friendly form titles
    const formattedApprovals: CMAgencyApproval[] = approvals.map(approval => {
      const formConfig = FORM_CONFIGS[approval.formType as keyof typeof FORM_CONFIGS];
      return {
        id: approval.id, 
        createdAt: approval.createdAt, 
        formType: approval.formType,
        formTitle: formConfig?.title || approval.formType, 
        formId: approval.formId,
        rowId: null, 
        productTag: 'Multiple', 
        remarks: null, 
      };
    });

    return { success: true, agency, approvals: formattedApprovals };

  } catch (error) {
    console.error("Error fetching CM agency approvals:", error);
    return { error: "Failed to fetch approval history." };
  }
}


// *** NEW ACTION FOR MODAL ***

// This defines the shape of the data returned by the ...ForAdmin functions
type AdminFormData = {
  id: string;
  status: string;
  createdAt?: Date; // FIX: Make optional
  formTitle?: string; 
  details: { id: string, [key: string]: unknown }[];
  agencyInfo?: { userId: string; name: string; email: string };
  [key: string]: unknown; 
} | null;

// This defines the approval data returned by this action
export type ApprovalWithDetails = CMApproval & {
  details: {
    employeeName: string;
    purposeOfVisit: string;
  } | null;
};

/**
 * Gets the full data for a single form AND the CM's approvals for that form
 */
export async function getCMAgencyFormDetailsAction(formId: string, formType: FormType) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Get the CM's profile
    const cmProfile = await getOrCreateCMProfile(session.user.id); 

    // 2. Fetch the full form data using the admin actions
    let formData: AdminFormData = null; 
    const formConfig = FORM_CONFIGS[formType];
    
    switch (formType) {
        case 'codeOfConduct': 
            formData = await getCodeOfConductByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'agencyVisits': 
            formData = await getAgencyVisitByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'declarationCumUndertaking': 
            formData = await getDeclarationByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'assetManagement': 
            formData = await getAssetManagementByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'telephoneDeclaration': 
            formData = await getTelephoneDeclarationByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'manpowerRegister': 
            formData = await getManpowerRegisterByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'productDeclaration': 
            formData = await getProductDeclarationByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'proactiveEscalation': 
            formData = await getProactiveEscalationByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'paymentRegister': 
            formData = await getPaymentRegisterByIdForAdmin(formId) as AdminFormData; 
            break;
        case 'repoKitTracker': 
            formData = await getRepoKitTrackerByIdForAdmin(formId) as AdminFormData; 
            break;
        default:
          return { error: "This form type is not supported for viewing." };
    }

    if (!formData) {
      return { error: "Form not found." };
    }
    
    // Manually add the formTitle to the formData object
    formData.formTitle = formConfig?.title || formType;
    
    // FIX (ts2769): Check if date exists and is valid before creating new Date
    if (!formData.createdAt && formData.details?.[0]?.date) {
        const dateValue = formData.details[0].date;
        if (typeof dateValue === 'string' || typeof dateValue === 'number') {
            formData.createdAt = new Date(dateValue);
        }
    }

    // 3. Fetch all of *this CM's* approvals for *this form*
    const approvals = await prisma.cMApproval.findMany({
      where: {
        cmProfileId: cmProfile.id,
        formId: formId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // 4. Find the specific rows that were approved (for forms like AgencyVisit)
    let approvedRowDetails: Record<string, { employeeName: string; purposeOfVisit: string }> = {};
    if (formType === 'agencyVisits' && formData.details) {
      const approvedRowIds = approvals.map(a => a.rowId).filter(Boolean) as string[];
      // FIX (ts2352): Use 'as unknown as' for a strong cast
      const rows = formData.details as unknown as (AgencyTableRow & { id: string })[];
      approvedRowDetails = rows
        .filter(row => approvedRowIds.includes(String(row.id)))
        .reduce((acc, row) => {
          acc[String(row.id)] = { 
            employeeName: row.employeeName, 
            purposeOfVisit: row.purposeOfVisit 
          };
          return acc;
        }, {} as Record<string, { employeeName: string; purposeOfVisit: string }>);
    }
    
    // 5. Combine approval with row details and add formTitle
    const combinedApprovals: ApprovalWithDetails[] = approvals.map(approval => {
      const formConfig = FORM_CONFIGS[approval.formType as keyof typeof FORM_CONFIGS];
      return {
        ...approval,
        formTitle: formConfig?.title || approval.formType, // Add formTitle to match type
        details: (approval.rowId && approvedRowDetails[approval.rowId])
          ? approvedRowDetails[approval.rowId] 
          : null
      };
    });

    return { 
      success: true, 
      formData, 
      approvals: combinedApprovals 
    };

  } catch (error) {
    console.error("Error fetching form details:", error);
    return { error: "Failed to fetch form details." };
  }
}