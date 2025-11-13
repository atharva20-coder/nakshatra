// src/app/super/cm-assignments/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getCollectionManagersSummaryAction } from "@/actions/collection-manager.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, ArrowRight } from "lucide-react";

export default async function CMAssignmentsSummaryPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const { managers, error } = await getCollectionManagersSummaryAction();

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        <h1 className="text-2xl font-bold my-4">Collection Managers</h1>
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
              Collection Manager Assignments
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage agency assignments for each Collection Manager.
            </p>
          </div>
          <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Managers Summary</CardTitle>
                <CardDescription>Click on a manager to manage their agency assignments.</CardDescription>
            </CardHeader>
            <CardContent>
                 {managers && managers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Agencies</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {managers.map(manager => (
                                    <tr key={manager.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <UserCheck className="h-5 w-5 text-gray-400 mr-3" />
                                                <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-700">{manager.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-700">
                                                <Users className="h-5 w-5 text-gray-400 mr-2" />
                                                {manager.assignedAgencyCount}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/super/cm-assignments/assign/${manager.id}`}>
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
                    <p className="text-center text-gray-500 py-8">No Collection Managers found in the system.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}