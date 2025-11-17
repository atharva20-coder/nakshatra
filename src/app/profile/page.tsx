//src/app/profile/page.tsx
import { ChangePasswordForm } from "@/components/change-password-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/agency-page-header";
import { UpdateUserForm } from "@/components/update-user-form";
import { UserRole } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationBell } from "@/components/notification-bell";
import { EnhancedActivityLogs } from "@/components/enhanced-activity-logs";
import { LayoutDashboard, UserCog, UserCheck, Search } from "lucide-react";
import { CollectionManagerProfileForm } from "@/components/cm-profile-form";
import { AgencyProfileForm } from "@/components/agency-profile-form"; // NEW IMPORT

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) redirect("/auth/login");

  if (session.user.banned) {
    redirect("/auth/deactivated"); 
  }

  const role = session.user.role;

  // Check if the user is an agency user (USER or COLLECTION_MANAGER)
  const isAgencyUser = role === UserRole.USER;

  const isAdminUser = role === UserRole.ADMIN;
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isAuditor = role === UserRole.AUDITOR;
  const isCollectionManager = role === UserRole.COLLECTION_MANAGER;

  // Determine the correct dashboard link based on role
  let dashboardLink: string | null = null;
  let dashboardLabel: string | null = null;
  let dashboardIcon: React.ReactNode | null = null;

  // Set dashboard link based on role
  if (isAdminUser) {
    dashboardLink = "/admin/dashboard";
    dashboardLabel = "Admin Panel";
    dashboardIcon = <UserCog className="mr-2 h-4 w-4" />;
  } else if (isSuperAdmin) {
    dashboardLink = "/super/dashboard";
    dashboardLabel = "Super Admin Panel";
    dashboardIcon = <UserCog className="mr-2 h-4 w-4" />;
  } else if (isAuditor) {
    dashboardLink = "/auditor/dashboard";
    dashboardLabel = "Auditor Dashboard";
    dashboardIcon = <Search className="mr-2 h-4 w-4" />;
  } else if (isCollectionManager) {
    dashboardLink = "/collectionManager/dashboard";
    dashboardLabel = "CM Dashboard";
    dashboardIcon = <UserCheck className="mr-2 h-4 w-4" />;
  } else if (role === UserRole.USER) {
    dashboardLink = "/user/dashboard";
    dashboardLabel = "Agency Dashboard";
    dashboardIcon = <LayoutDashboard className="mr-2 h-4 w-4" />;
  }

  // Determine the default tab based on role
  const defaultTab = isAgencyUser && role === UserRole.USER ? "agency" : "account";
  // Determine grid columns for TabsList based on whether agency tab is present
  const tabsListCols = isAgencyUser && role === UserRole.USER ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conditionally render PageHeader ONLY for Agency Users */}
      {isAgencyUser && (
        <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
      )}

      <div className="px-6 py-12 container mx-auto max-w-6xl space-y-10">
        {/* --- PAGE HEADER --- */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">Profile</h1>
            <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">
              Manage your account details and view activity logs
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Conditional Dashboard Button */}
            {dashboardLink && dashboardLabel && (
              <Button
                size="sm"
                className="bg-rose-900 text-white hover:bg-rose-950 font-medium dark:bg-rose-700 dark:hover:bg-rose-600"
                asChild
              >
                <Link href={dashboardLink}>
                  {dashboardIcon}
                  {dashboardLabel}
                </Link>
              </Button>
            )}
            {/* Notification Bell for Admins/Super Admins */}
            {(isAdminUser || isSuperAdmin) && <NotificationBell />}
            <SignOutButton />
          </div>
        </div>

        {/* --- TABS SECTION --- */}
        <Tabs defaultValue={defaultTab} className="space-y-8">
          <TabsList className={`grid ${tabsListCols} w-full max-w-md mx-auto`}>
            {/* Agency Details Tab only for USER role */}
            {role === UserRole.USER && (
              <TabsTrigger value="agency">Agency Details</TabsTrigger>
            )}
            {/* Admin/Auditor/CM Details Tab */}
            {(isAdminUser || isSuperAdmin || isAuditor || isCollectionManager) && (
              <TabsTrigger value="admin">
                {isSuperAdmin
                  ? "Super Admin Details"
                  : isAuditor
                  ? "Auditor Details"
                  : isCollectionManager
                  ? "Collection Manager Details"
                  : "Admin Details"}
              </TabsTrigger>
            )}
            <TabsTrigger value="account">Account Management</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          {/* === TAB: ADMIN / SUPER_ADMIN / AUDITOR / COLLECTION_MANAGER === */}
          {(isAdminUser || isSuperAdmin || isAuditor || isCollectionManager) && (
            <TabsContent value="admin" className="space-y-10">
              {isCollectionManager ? (
                // For Collection Managers, show the dynamic form
                <CollectionManagerProfileForm />
              ) : (
                // For Admins, Super Admins, and Auditors, show the static card
                <section className="space-y-8">
                  <div className="pb-4 border-b dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
                      {isSuperAdmin
                        ? "Super Admin Information"
                        : isAuditor
                        ? "Auditor Information"
                        : "Admin Information"}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">
                      {isSuperAdmin
                        ? "Overview of your system-level credentials and privileges."
                        : isAuditor
                        ? "Overview of your audit credentials and assigned reports."
                        : "Overview of your admin credentials and reporting structure."}
                    </p>
                  </div>
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader>
                      <CardTitle className="dark:text-gray-100">
                        {isSuperAdmin
                          ? "Super Admin Details"
                          : isAuditor
                          ? "Auditor Details"
                          : "Admin Employee Details"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="empId" className="dark:text-gray-300">Employee ID</Label>
                          <Input id="empId" placeholder="N/A" readOnly className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"/>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name" className="dark:text-gray-300">Full Name</Label>
                          <Input
                            id="name"
                            value={session.user.name ?? ""}
                            readOnly
                            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="dark:text-gray-300">Official Email</Label>
                          <Input
                            id="email"
                            value={session.user.email ?? ""}
                            readOnly
                            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role" className="dark:text-gray-300">Role</Label>
                          <Input id="role" value={role} readOnly className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"/>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}
            </TabsContent>
          )}

          {/* === TAB: AGENCY DETAILS (Only for USER role) === */}
          {role === UserRole.USER && (
            <TabsContent value="agency" className="space-y-10">
              <section className="space-y-8">
                <div className="pb-4 border-b dark:border-gray-700">
                  <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
                    Agency Information
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">
                    Manage your agency&apos;s official details, key personnel, and branches.
                  </p>
                </div>

                {/* NEW: Replace the static form with the dynamic component */}
                <AgencyProfileForm />
              </section>
            </TabsContent>
          )}

          {/* === TAB: ACCOUNT MANAGEMENT (Visible to all) === */}
          <TabsContent value="account" className="space-y-10">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">Update Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <UpdateUserForm
                  name={session.user.name ?? ""}
                  image={session.user.image ?? ""}
                />
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB: LOGS (Visible to all) === */}
          <TabsContent value="logs">
            <EnhancedActivityLogs userId={session.user.id} isOwnProfile={true} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}