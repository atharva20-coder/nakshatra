// src/app/super/reports/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { getAssignmentReportAction, getAuditReportAction } from "@/actions/reports.action"; // Import new action
import { AssignmentReportClient } from "@/components/reports/assignment-report-client";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AssignmentReportsPage({ searchParams }: PageProps) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const resolvedSearchParams = await searchParams;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const month = parseInt(resolvedSearchParams.month as string || String(currentMonth));
  const year = parseInt(resolvedSearchParams.year as string || String(currentYear));

  // 1. Fetch assignment data
  const { auditAssignments, cmAssignments, error: assignmentError } = await getAssignmentReportAction({ month, year });

  // 2. --- NEW: Fetch audit report data ---
  const { audits, error: auditError } = await getAuditReportAction({ month, year });
  // --- END NEW ---

  if (assignmentError || auditError) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        <h1 className="text-2xl font-bold my-4">Error</h1>
        <p className="text-red-600">{assignmentError || auditError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-7xl space-y-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Assignment Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View all agency assignments, audits, and scorecards for a specific month.
            </p>
          </div>
          <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        </div>

        <Card>
          <CardContent className="p-6">
            <AssignmentReportClient 
              initialAuditAssignments={auditAssignments || []}
              initialCmAssignments={cmAssignments || []}
              initialAuditReport={audits || []} // --- NEW PROP ---
              initialMonth={month}
              initialYear={year} initialPenalties={[]}            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}