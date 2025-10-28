// src/app/super/audits/assign/[id]/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getFirmAssignmentDetailsAction } from "@/actions/audit-management.action";
import { FirmAgencyAssignmentClient } from "@/components/audit/firm-agency-assignment-client";
import { ReturnButton } from "@/components/return-button";
// Removed unused imports

// Define the expected structure for the agency data returned by the action
interface AgencyWithStatusForPage {
    id: string;
    name: string;
    email: string;
    isAssigned: boolean;
    isAssignedToCurrentFirm: boolean;
    assignedFirmName: string | null;
}

// Define the expected structure for the firm data
interface FirmForPage {
    id: string;
    name: string;
}

// Define standard Page Props for Next.js App Router
// Change this:
interface PageProps {
  params: Promise<{ id: string }>;
}

// Use the standard PageProps interface
export default async function AssignToFirmPage({ params }: PageProps) {
  const resolvedParams = await params;
  const firmId = resolvedParams.id; // Access id from awaited params
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const result = await getFirmAssignmentDetailsAction(firmId);

  // Directly check the properties returned by the action
  if (result.error || !result.firm || !result.agencies) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/audits" label="Back to Audits List" />
        <h1 className="text-2xl font-bold my-4">Error</h1>
        <p className="text-red-600">{result.error || "Could not load assignment details."}</p>
      </div>
    );
  }

   // Type the data using the interfaces defined above
   const agencies: AgencyWithStatusForPage[] = result.agencies;
   const firm: FirmForPage = result.firm; // Use the specific firm type


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-6xl space-y-8">
        <div className="flex justify-between items-center">
            <ReturnButton href="/super/audits" label="Back to All Firms" />
        </div>
        
        {/* Pass the firm and agencies data correctly */}
        <FirmAgencyAssignmentClient firm={firm} agencies={agencies} />
      </div>
    </div>
  );
}

