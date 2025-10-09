import { ChangePasswordForm } from "@/components/change-password-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/agency-page-header";
import { Textarea } from "@/components/ui/textarea";
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
// ✨ NEW: Import the new component for managing branch details
import { BranchDetailsManager } from "@/components/branch-details-manager";

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) redirect("/auth/login");


  const isAgencyUser =
    session.user.role === UserRole.USER ||
    session.user.role === UserRole.COLLECTION_MANAGER;

  const isAdminUser = session.user.role === UserRole.ADMIN;


  return (
    <div>
      {isAgencyUser && (
        <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />
      )}
      {isAdminUser && (
        <PageHeader
          returnHref="/admin/dashboard"
          returnLabel="Back to Admin Dashboard"
        />
      )}

      <div className="px-6 py-12 container mx-auto max-w-6xl space-y-10">
        {/* --- PAGE HEADER --- */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isAdminUser
                ? "Manage your administrative details and supervisor information"
                : "Manage your personal and agency details"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdminUser && (
              <Button
                size="sm"
                className="bg-rose-900 text-white hover:bg-rose-950 font-medium"
                asChild
              >
                <Link href="/admin/dashboard">Admin Panel</Link>
              </Button>
            )}
            <SignOutButton />
          </div>
        </div>

        {/* --- TABS SECTION --- */}
        <Tabs
          defaultValue={isAdminUser ? "admin" : "agency"}
          className="space-y-8"
        >
          <TabsList
            className={`grid ${
              isAdminUser ? "grid-cols-2" : "grid-cols-3"
            } w-full max-w-md mx-auto`}
          >
            {!isAdminUser && <TabsTrigger value="agency">Agency Details</TabsTrigger>}
            {isAdminUser && <TabsTrigger value="admin">Admin Details</TabsTrigger>}
            <TabsTrigger value="account">Account Management</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          {/* === TAB: ADMIN DETAILS === */}
          {isAdminUser && (
            <TabsContent value="admin" className="space-y-10">
              <section className="space-y-8">
                <div className="pb-4 border-b">
                  <h2 className="text-3xl font-bold text-neutral-800">
                    Admin Information
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Overview of your admin credentials and reporting structure.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Admin Employee Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="empId">Employee ID</Label>
                        <Input
                          id="empId"
                        
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={session.user.name ?? ""}
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Official Email</Label>
                        <Input
                          id="email"
                          value={session.user.email ?? ""}
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Contact Number</Label>
                        <Input
                          id="phone"
                          
                          readOnly
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Supervisor Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="supName">Supervisor Name</Label>
                        <Input
                          id="supName"
                          
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supEmail">Supervisor Email</Label>
                        <Input
                          id="supEmail"
                          
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supContact">Supervisor Contact</Label>
                        <Input
                          id="supContact"
                          
                          readOnly
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>
          )}

          {/* === TAB: AGENCY DETAILS === */}
          {!isAdminUser && (
            <TabsContent value="agency" className="space-y-10">
              <section className="space-y-8">
                <div className="pb-4 border-b">
                  <h2 className="text-3xl font-bold text-neutral-800">
                    Agency Information
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Manage your agency’s official details, key personnel, and
                    branches.
                  </p>
                </div>

                <form className="space-y-10">
                  {/* --- PRIMARY DETAILS --- */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Primary Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="vemId">Agency VEM ID</Label>
                          <Input id="vemId" placeholder="Enter VEM ID" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pan">Agency PAN Card No.</Label>
                          <Input id="pan" placeholder="Enter PAN Card No." />
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <Label htmlFor="agencyName">Agency Name</Label>
                          <Input
                            id="agencyName"
                            placeholder="Enter Agency Name"
                          />
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <Label htmlFor="agencyAddress">Agency Address</Label>
                          <Textarea
                            id="agencyAddress"
                            placeholder="Enter full agency address"
                            rows={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* --- KEY PERSON DETAILS --- */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Person Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="director">
                            Proprietor/Partner/Director
                          </Label>
                          <Input id="director" placeholder="Enter full name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactNo">Contact No.</Label>
                          <Input id="contactNo" placeholder="Enter contact" />
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <Label htmlFor="email">Email ID</Label>
                          <Input
                            id="email"
                            type="email"
                            defaultValue={session.user.email}
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ✨ --- NEW: BRANCH DETAILS SECTION --- ✨ */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Branch Details</CardTitle>
                      <p className="text-sm text-muted-foreground pt-1">
                        Add details for each branch office. If you don&apos;t have
                        any branches, you can leave this section empty.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <BranchDetailsManager />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button
                      size="lg"
                      className="bg-rose-800 hover:bg-rose-900 text-white"
                    >
                      Save Agency Details
                    </Button>
                  </div>
                </form>
              </section>
            </TabsContent>
          )}

          {/* === TAB: ACCOUNT MANAGEMENT === */}
          <TabsContent value="account" className="space-y-10">
            <section className="space-y-4 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
              <h2 className="text-2xl font-semibold text-neutral-800 border-b pb-2">
                Update User Profile
              </h2>
              <UpdateUserForm
                name={session.user.name}
                image={session.user.image ?? ""}
              />
            </section>

            <section className="space-y-4 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
              <h2 className="text-2xl font-semibold text-neutral-800 border-b pb-2">
                Change Password
              </h2>
              <ChangePasswordForm />
            </section>
          </TabsContent>

          {/* === TAB: LOGS === */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Track all actions performed by the user (form edits,
                  submissions, approvals, etc.)
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto text-sm text-gray-700">
                  <h3 className="font-semibold mb-2">Session / Log Data</h3>
                  <code>
                    <pre>{JSON.stringify(session, null, 2)}</pre>
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}