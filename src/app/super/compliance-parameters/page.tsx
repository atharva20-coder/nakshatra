import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { getAllComplianceParametersAction } from "@/actions/compliance-parameter.action";
import { ComplianceParameterManager } from "@/components/super-admin/compliance-parameter-manager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function ComplianceParametersPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const { parameters, error } = await getAllComplianceParametersAction();

  if (error || !parameters) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Could not load parameters."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Manage Compliance Parameters
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Add, edit, reorder, and deactivate parameters for the Monthly Compliance form.
            </p>
          </div>
          <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        </div>

        <ComplianceParameterManager initialParameters={parameters} />
      </div>
    </div>
  );
}