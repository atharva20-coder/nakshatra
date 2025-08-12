import { ChangePasswordForm } from "@/components/change-password-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { UpdateUserForm } from "@/components/update-user-form";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { PageHeader } from "@/components/agency-page-header";
import { UserRole } from "@/generated/prisma";

export default async function Page() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) redirect("/auth/login");

  const FULL_POST_ACCESS = await auth.api.userHasPermission({
    headers: headersList,
    body: {
      permissions: {
        posts: ["update", "delete"],
      },
    },
  });

  const isAgencyUser = session.user.role === UserRole.USER || session.user.role === UserRole.COLLECTION_MANAGER;

  return (
    <div>
      {isAgencyUser && (
        <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />
      )}
      <div className="px-6 py-12 container mx-auto max-w-5xl space-y-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your account and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            {session.user.role === "ADMIN" && (
              <Button
                size="sm"
                className="bg-rose-900 text-white hover:bg-rose-950 font-medium"
                asChild
              >
                <Link href="/admin/dashboard">Admin Dashboard</Link>
              </Button>
            )}
            <SignOutButton />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-neutral-700 border-l-4 pl-3 border-rose-800">Permissions</h2>
          <div className="flex flex-wrap gap-3 mt-2">
            <Button size="sm" className="bg-rose-800 text-white hover:bg-rose-900">
              <Link href="/dashboard">Manage Own Forms</Link>
            </Button>
            {FULL_POST_ACCESS.success && (
              <Button size="sm" className="bg-rose-800 text-white hover:bg-rose-900">
                Manage All Posts
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name}
              width={96}
              height={96}
              className="border border-muted rounded-full object-cover"
            />
          ) : (
            <div className="size-24 border border-muted rounded-full bg-rose-800 text-white flex items-center justify-center text-xl font-semibold">
              {session.user.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-neutral-700">{session.user.name}</h3>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto text-sm text-gray-700">
          <code>
            <pre>{JSON.stringify(session, null, 2)}</pre>
          </code>
        </div>

        <section className="space-y-4 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold text-neutral-800 border-b pb-2">Update User</h2>
          <UpdateUserForm name={session.user.name} image={session.user.image ?? ""} />
        </section>

        <section className="space-y-4 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold text-neutral-800 border-b pb-2">Change Password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
