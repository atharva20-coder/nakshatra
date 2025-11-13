import { DeleteUserButton, PlaceholderDeleteUserButton } from "@/components/delete-user-button";
import { ReturnButton } from "@/components/return-button";
import { UserRoleSelect } from "@/components/user-role-select";
import { UserRole } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, FileCheck2, BarChart2, ShieldAlert, Megaphone, GraduationCap } from "lucide-react";
import { AdvisoryMarquee } from "@/components/AdvisoryMarquee";

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
        <div className="space-y-8">
          <ReturnButton href="/profile" label="Profile" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="p-2 rounded-md text-lg bg-rose-900 text-white font-bold">
          FORBIDDEN
        </p>
      </div>
    );
  }

  const { users } = await auth.api.listUsers({
    headers: headersList,
    query: {
      sortBy: "name",
    },
  });

  const sortedUsers = users.sort((a, b) => {
    if (a.role === "ADMIN" && b.role !== "ADMIN") return 1;
    if (a.role !== "ADMIN" && b.role === "ADMIN") return -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-8 py-12 container mx-auto max-w-screen-xl">
        
        <div className="flex justify-between items-center mb-8">
          <AdvisoryMarquee />
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-lg text-gray-500">Welcome, {session.user.name}.</p>
          </div>
          <ReturnButton href="/profile" label="Back to Profile" />
        </div>

        {/* Management Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Request/Approval Management</CardTitle>
              <FileText className="h-6 w-6 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View and manage form edit approvals</p>
              <Link href="/admin/approvals" className="text-rose-600 font-semibold hover:underline">
                Go to requests page
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Audit Review Queue, Show Cause Notice, & Score Card</CardTitle>
              <FileCheck2 className="h-6 w-6 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Review completed audits and issue show cause notices.</p>
              <Link href="/admin/audits" className="text-blue-600 font-semibold hover:underline">
                Go to review queue
              </Link>
            </CardContent>
          </Card>


          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reports</CardTitle>
              <BarChart2 className="h-6 w-6 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View monthly assignment and audit reports.</p>
              <Link href="/admin/reports" className="text-rose-600 font-semibold hover:underline">
                Go to reports
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agency Activities</CardTitle>
              <Users className="h-6 w-6 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Review and manage agencies.</p>
              <Link href="/admin/forms" className="text-rose-600 font-semibold hover:underline">
                View All Agency Forms
              </Link>
            </CardContent>
          </Card>
        </div>

        <div id="user-table">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <table className="min-w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b text-sm text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium text-center">Role</th>
                      <th className="px-4 py-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedUsers.map((user) => (
                      <tr key={user.id} className="text-sm text-gray-700 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{user.id.slice(0, 8)}</td>
                        <td className="px-4 py-3">{user.name}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 text-center">
                          <UserRoleSelect userId={user.id} role={user.role as UserRole} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.role === "USER" ? (
                            <DeleteUserButton userId={user.id} />
                          ) : (
                            <PlaceholderDeleteUserButton />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}