import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getAuditingFirmsSummaryAction } from "@/actions/audit-management.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { Button } from "@/components/ui/button";
import { Building, Users, ArrowRight } from "lucide-react";

export default async function AuditFirmsSummaryPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const { firms, error } = await getAuditingFirmsSummaryAction();

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        <h1 className="text-2xl font-bold my-4">Auditing Firms</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-4xl space-y-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Auditing Firms Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage agency assignments for each auditing firm.
            </p>
          </div>
          <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Firms Summary</CardTitle>
                <CardDescription>Click on a firm to manage its agency assignments.</CardDescription>
            </CardHeader>
            <CardContent>
                 {firms && firms.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Agencies</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {firms.map(firm => (
                                    <tr key={firm.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Building className="h-5 w-5 text-gray-400 mr-3" />
                                                <div className="text-sm font-medium text-gray-900">{firm.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-700">
                                                <Users className="h-5 w-5 text-gray-400 mr-2" />
                                                {firm._count.agencyAssignments}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/super/audits/assign/${firm.id}`}>
                                                    Manage Assignments <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">No auditing firms found in the system.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
