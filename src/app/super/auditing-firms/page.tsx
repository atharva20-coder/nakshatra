// src/app/super/auditing-firms/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getAllAuditingFirmsAction } from "@/actions/auditor-registration.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { Button } from "@/components/ui/button";
import { Building, Users, FileText, Plus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AuditingFirmsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const { firms, error } = await getAllAuditingFirmsAction();

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        <h1 className="text-2xl font-bold my-4">Auditing Firms Management</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-7xl space-y-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Auditing Firms Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Register and manage auditing firms and their key personnel.
            </p>
          </div>
          <div className="flex gap-4">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href="/super/auditing-firms/register">
                <Plus className="mr-2 h-4 w-4" /> Register New Firm
              </Link>
            </Button>
            <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Firms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{firms?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {firms?.reduce((sum, firm) => sum + firm._count.agencyAssignments, 0) || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {firms?.reduce((sum, firm) => sum + firm._count.audits, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Firms List */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Auditing Firms</CardTitle>
            <CardDescription>
              All auditing firms registered in the system with their key personnel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {firms && firms.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Firm Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Key Person
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignments
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Audits
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900">
                    {firms.map((firm) => {
                      const keyPerson = firm.auditors[0]?.user;
                      return (
                        <tr key={firm.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Building className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {firm.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {firm.contactPerson || "N/A"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {keyPerson ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {keyPerson.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {keyPerson.email}
                                </div>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Verified
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No key person</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {firm.contactEmail || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {firm.contactPhone || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium">
                                {firm._count.agencyAssignments}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium">
                                {firm._count.audits}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/super/auditing-firms/${firm.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No auditing firms registered
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by registering your first auditing firm.
                </p>
                <div className="mt-6">
                  <Button asChild className="bg-green-600 hover:bg-green-700">
                    <Link href="/super/auditing-firms/register">
                      <Plus className="mr-2 h-4 w-4" /> Register New Firm
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}