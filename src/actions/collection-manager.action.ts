// src/actions/collection-manager.action.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma } from "@/generated/prisma";
import { headers } from "next/headers";

// Type-safe response types
interface CMProfile {
  id: string;
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
    const cmUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });

    if (!cmUser) {
      return { error: "Collection Manager profile not found" };
    }

    // TODO: Add actual CM-specific fields to User model or create separate CM profile table
    // For now, return basic profile with placeholder data
    const profile: CMProfile = {
      id: cmUser.id,
      name: cmUser.name,
      email: cmUser.email,
      employeeId: "CM-" + cmUser.id.substring(0, 8).toUpperCase(),
      designation: "Collection Manager",
      productAssigned: "Credit Card, Personal Loan", // TODO: Make this dynamic
      supervisorName: null, // TODO: Link to supervisor
      supervisorEmail: null,
      supervisorEmployeeId: null,
      createdAt: cmUser.createdAt,
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

    // Get submission stats for each agency
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

    // Get recent submissions (last 10)
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