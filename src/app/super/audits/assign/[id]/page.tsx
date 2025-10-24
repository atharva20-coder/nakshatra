import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getFirmAssignmentDetailsAction } from "@/actions/audit-management.action";
import { FirmAgencyAssignmentClient } from "@/components/audit/firm-agency-assignment-client";
import { ReturnButton } from "@/components/return-button";

interface AssignToFirmPageProps {
    params: {
        id: string; // This is the firm ID
    };
}

export default async function AssignToFirmPage({ params }: AssignToFirmPageProps) {
  const firmId = params.id;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const result = await getFirmAssignmentDetailsAction(firmId);

  if (result.error || !result.firm || !result.agencies) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/audits" label="Back to Audits List" />
        <h1 className="text-2xl font-bold my-4">Error</h1>
        <p className="text-red-600">{result.error || "Could not load assignment details."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-6xl space-y-8">
        <div className="flex justify-between items-center">
            <ReturnButton href="/super/audits" label="Back to All Firms" />
        </div>
        
        <FirmAgencyAssignmentClient firm={result.firm} agencies={result.agencies} />
      </div>
    </div>
  );
}
