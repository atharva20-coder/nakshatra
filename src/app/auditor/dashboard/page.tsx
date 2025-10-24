// src/app/auditor/dashboard/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getAssignedAgenciesAction } from "@/actions/audit-management.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReturnButton } from "@/components/return-button";
import { Users, Building2, Calendar, FileText, Plus } from "lucide-react"; // Added Plus

export default async function AuditorDashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.AUDITOR) {
    redirect("/auth/login");
  }

  const result = await getAssignedAgenciesAction();

  if (result.error) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Auditor Dashboard</h1>
            <p className="text-red-600">{result.error}</p>
            <ReturnButton href="/profile" label="Back to Profile" />
        </div>
      </div>
    );
  }

  const { assignments, firm } = result;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
              Auditor Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Welcome, {session.user.name} • {firm?.name}
            </p>
          </div>
          <ReturnButton href="/profile" label="Back to Profile" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Assigned Agencies
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {assignments?.length || 0}
                  </p>
                </div>
                <Building2 className="h-12 w-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
           {/* Add more relevant stats cards here if needed, e.g., audits in progress, observations pending */}
           <Card>
             <CardContent className="p-6">
               {/* Placeholder for another stat */}
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Audits In Progress</p>
                   <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">?</p> {/* Add logic later */}
                 </div>
                 <FileText className="h-12 w-12 text-green-500" />
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-6">
                {/* Placeholder for another stat */}
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-gray-600 dark:text-gray-400">Observations Added</p>
                   <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">?</p> {/* Add logic later */}
                 </div>
                 <Calendar className="h-12 w-12 text-purple-500" />
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Assigned Agencies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agencies Assigned to {firm?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments && assignments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agency Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                       <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned On
                      </th>
                       <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{assignment.agency.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{assignment.agency.email}</div>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           {/* Link to the agency-specific audit page */}
                           <Button asChild variant="outline" size="sm">
                             <Link href={`/auditor/users/${assignment.agency.id}`}>
                                View / Start Audit
                             </Link>
                           </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No agencies assigned</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Agencies will appear here once assigned by a Super Admin.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}