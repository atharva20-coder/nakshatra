// src/app/super/cm-assignments/assign/[id]/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getCMAssignmentDetailsAction } from "@/actions/collection-manager.action";
import { CMAgencyAssignmentClient } from "@/components/audit/cm-agency-assignment-client";
import { ReturnButton } from "@/components/return-button";

interface AgencyWithStatusForPage {
    id: string;
    name: string;
    email: string;
    isAssigned: boolean;
    isAssignedToCurrentCM: boolean;
    assignedCMName: string | null;
}

interface CMForPage {
    id: string;
    name: string;
    email: string;
    cmProfileId: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignToCMPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cmUserId = resolvedParams.id;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const result = await getCMAssignmentDetailsAction(cmUserId);

  if (result.error || !result.cmUser || !result.agencies) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/cm-assignments" label="Back to CM List" />
        <h1 className="text-2xl font-bold my-4">Error</h1>
        <p className="text-red-600">{result.error || "Could not load assignment details."}</p>
      </div>
    );
  }

   const agencies: AgencyWithStatusForPage[] = result.agencies;
   const cmUser: CMForPage = result.cmUser;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-6xl space-y-8">
        <div className="flex justify-between items-center">
            <ReturnButton href="/super/cm-assignments" label="Back to All Managers" />
        </div>
        
        <CMAgencyAssignmentClient cmUser={cmUser} agencies={agencies} />
      </div>
    </div>
  );
}