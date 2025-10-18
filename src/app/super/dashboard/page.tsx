import { DeleteUserButton, PlaceholderDeleteUserButton } from "@/components/delete-user-button";
import { ReturnButton } from "@/components/return-button";
import { UserRoleSelect } from "@/components/user-role-select";
import { UserRole } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, UserCheck } from "lucide-react";

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    redirect("/auth/login");
  }

  // This page is strictly for SUPER_ADMINs
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

  const { users } = await auth.api.listUsers({
    headers: headersList,
    query: {
      sortBy: "name",
    },
  });

  // Sort users to push ADMINs to the bottom for better visibility of regular users
  const sortedUsers = users.sort((a, b) => {
    if (a.role === "SUPER_ADMIN" && b.role !== "SUPER_ADMIN") return 1;
    if (a.role !== "SUPER_ADMIN" && b.role === "SUPER_ADMIN") return -1;
    return 0;
  });

  // Calculate user statistics
  const totalUsers = users.length;
  const adminCount = users.filter(user => user.role === 'ADMIN' || user.role === 'SUPER_ADMIN').length;
  const standardUserCount = totalUsers - adminCount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-8 py-12 container mx-auto max-w-screen-xl">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Super Admin Dashboard</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">Welcome back, {session.user.name}.</p>
          </div>
          <ReturnButton href="/profile" label="Back to Profile" />
        </div>

        {/* USER MANAGEMENT TABLE */}
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
                      <tr key={user.id} className="text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50">
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