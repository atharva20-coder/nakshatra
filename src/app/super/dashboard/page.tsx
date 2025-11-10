// src/app/super/dashboard/page.tsx
import { DeleteUserButton, PlaceholderDeleteUserButton } from "@/components/delete-user-button";
import { ReturnButton } from "@/components/return-button";
import { UserRoleSelect } from "@/components/user-role-select";
import { UserRole } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DeactivateUserToggle } from "@/components/deactivate-user-toggle";
import { UserCheck, Settings, LinkIcon, FileText, Building, FileCheck2, ListChecks, Megaphone } from "lucide-react"; // Added ListChecks

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  // Redirect if no session
  if (!session) {
    redirect("/auth/login");
  }

  // Restrict access to SUPER_ADMINs only
  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
        <div className="space-y-8">
          <ReturnButton href="/profile" label="Profile" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="p-2 rounded-md text-lg bg-rose-900 text-white font-bold">
          ACCESS FORBIDDEN: This page is restricted to Super Admins.
        </p>
      </div>
    );
  }

  // Fetch all users
  const { users } = await auth.api.listUsers({
    headers: headersList,
    query: { sortBy: "name" },
  });

  // Sort users: SUPER_ADMINs at bottom
  const sortedUsers = users.sort((a, b) => {
    if (a.role === "SUPER_ADMIN" && b.role !== "SUPER_ADMIN") return 1;
    if (a.role !== "SUPER_ADMIN" && b.role === "SUPER_ADMIN") return -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-8 py-12 container mx-auto max-w-screen-xl">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">
              Super Admin Dashboard
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">
              Welcome back, {session.user.name}.
            </p>
          </div>
          <ReturnButton href="/profile" label="Back to Profile" />
        </div>

        {/* --- MANAGEMENT CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auditing Firms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Firms</div>
              <p className="text-xs text-muted-foreground mb-4">
                Register and manage auditing firms.
              </p>
              <Button size="sm" asChild>
                <Link href="/super/auditing-firms">
                  <LinkIcon className="mr-2 h-4 w-4" /> Manage Firms
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Management</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Assign Audits</div>
              <p className="text-xs text-muted-foreground mb-4">
                Assign agencies to specific auditing firms.
              </p>
              <Button size="sm" asChild>
                <Link href="/super/auditing-firms/audits">
                  <LinkIcon className="mr-2 h-4 w-4" /> Go to Assignments
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CM Assignment</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Assign Agencies</div>
              <p className="text-xs text-muted-foreground mb-4">
                Assign agencies to specific Collection Managers.
              </p>
              <Button size="sm" asChild>
                <Link href="/super/cm-assignments">
                  <LinkIcon className="mr-2 h-4 w-4" /> Go to Assignments
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Review Queue</CardTitle>
              <FileCheck2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Review Audits</div>
              <p className="text-xs text-muted-foreground mb-4">
                Review completed audits and publish scorecards.
              </p>
              <Button size="sm" asChild variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                <Link href="/admin/audits">
                  <LinkIcon className="mr-2 h-4 w-4" /> Go to Review Queue
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignment Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">View Reports</div>
              <p className="text-xs text-muted-foreground mb-4">
                Monthly reports of all agency assignments.
              </p>
              <Button size="sm" asChild>
                <Link href="/super/reports">
                  <LinkIcon className="mr-2 h-4 w-4" /> View Reports
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* --- NEW CARD --- */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Parameters</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Form</div>
              <p className="text-xs text-muted-foreground mb-4">
                Edit the &quot;Monthly Compliance&quot; form parameters.
              </p>
              <Button size="sm" asChild>
                <Link href="/super/compliance-parameters">
                  <LinkIcon className="mr-2 h-4 w-4" /> Manage Parameters
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Announcements</div>
              <p className="text-xs text-muted-foreground mb-4">
                Create advisories for Admins, Agencies, Auditors & Collection Managers
              </p>
              <Button size="sm" asChild>
                <Link href="/super/announcements">
                  <LinkIcon className="mr-2 h-4 w-4" /> Manage Announcements
                </Link>
              </Button>
            </CardContent>
          </Card>
          {/* --- END NEW CARD --- */}
        </div>
        {/* --- END MANAGEMENT CARDS --- */}


        {/* --- USER MANAGEMENT TABLE --- */}
        <div id="user-table">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Assign roles and manage user accounts directly from this table.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <table className="min-w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-800 text-sm text-left text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3 font-medium">User ID</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium text-center">Role</th>
                      <th className="px-4 py-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{user.id.slice(0, 8)}</td>
                        <td className="px-4 py-3">{user.name}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 text-center">
                          <UserRoleSelect userId={user.id} role={user.role as UserRole} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.role !== "SUPER_ADMIN" ? (
                            <DeactivateUserToggle 
                              userId={user.id} 
                              isBanned={user.banned ?? false} 
                            />
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
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
        {/* --- END USER MANAGEMENT TABLE --- */}
      </div>
    </div>
  );
}