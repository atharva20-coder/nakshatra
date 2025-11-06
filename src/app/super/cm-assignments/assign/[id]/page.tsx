import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getCMAssignmentDetailsAction } from "@/actions/collection-manager.action";
import { CMAgencyAssignmentClient } from "@/components/audit/cm-agency-assignment-client";
import { ReturnButton } from "@/components/return-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, UserX } from "lucide-react";

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

  // --- ELEGANT ERROR HANDLING ---
  // This block now catches the error and displays it in an Alert component.
  if (result.error || !result.cmUser || !result.agencies) {
    const isProfileError = result.error === "Collection Manager profile not found.";

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-12 max-w-4xl space-y-8">
          <div className="flex justify-between items-center">
            <ReturnButton href="/super/cm-assignments" label="Back to CM List" />
          </div>
          
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {isProfileError ? "Profile Not Found" : "An Error Occurred"}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{result.error || "Could not load assignment details for this user."}</p>
              {isProfileError && (
                <p className="font-medium">
                  This user has the &apos;COLLECTION_MANAGER&apos; role, but their
                  Collection Manager profile has not been set up. A profile
                  is required to manage agency assignments.
                </p>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-10 border-2 border-dashed rounded-lg">
              <UserX className="h-16 w-16 text-gray-400" />
              <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Unable to Load Assignments</h2>
              <p className="mt-2 text-sm">
                Please ensure the selected Collection Manager has a complete profile in the system.
              </p>
          </div>
        </div>
      </div>
    );
  }
  // --- END OF ERROR HANDLING ---

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