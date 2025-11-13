// src/app/admin/bulk-scn/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getAgenciesWithPendingObservationsAction } from "@/actions/bulk-scn.action";
import { ReturnButton } from "@/components/return-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { BulkSCNClient } from "@/components/admin/BulkSCNClient";

export default async function BulkSCNPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    redirect("/auth/login");
  }

  const result = await getAgenciesWithPendingObservationsAction();

  if (result.error) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/admin/audits" label="Back to Audits" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Bulk Show Cause Notice Issuance</h1>
            <p className="text-muted-foreground mt-1">
              Issue Show Cause Notices to multiple agencies at once
            </p>
          </div>
          <ReturnButton href="/admin/audits" label="Back to Audits" />
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">How Bulk SCN Works</AlertTitle>
          <AlertDescription className="text-blue-800">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Select multiple agencies with pending observations</li>
              <li>Choose which observations to include for each agency</li>
              <li>Use the same subject, details, and deadline for all notices</li>
              <li>All notices are issued simultaneously with individual tracking</li>
            </ul>
          </AlertDescription>
        </Alert>

        <BulkSCNClient agencies={result.agencies || []} />
      </div>
    </div>
  );
}