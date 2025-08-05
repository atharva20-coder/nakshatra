import { ChangePasswordForm } from '@/components/change-password-form';
import { ReturnButton } from '@/components/return-button';
import { SignOutButton } from '@/components/sign-out-button';
import { Button } from '@/components/ui/button';
import { UpdateUserForm } from '@/components/update-user-form';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react'

export default async function Page() {
  const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList
    })

    if(!session) redirect("/auth/login");

    const FULL_POST_ACCESS = await auth.api.userHasPermission({
      headers: headersList,
      body: {
        permissions: {
          posts: ["update", "delete"],
        }
      }
    });


  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/" label="Home" />
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>
      <div className="flex items-center gap-2">
        {session.user.role === "ADMIN" && (
          <Button size="sm" className="bg-rose-900 text-white hover:bg-rose-950 font-semibold px-4 py-2 rounded-md transition-colors" asChild>
            <Link href="/admin/dashboard">
              Admin Dashboard
            </Link>
          </Button>
        )}
        <SignOutButton />
      </div>
      
      <div className="text-2xl font-bold">Permissions</div>
      <div className="space-x-4">
        <Button
          size="sm"
          className="bg-rose-900 text-white hover:bg-rose-950 font-semibold px-4 py-2 rounded-md transition-colors"
        >
          Manage Own Posts
        </Button>
        {FULL_POST_ACCESS.success && (
          <Button 
            size="sm"
            className="bg-rose-900 text-white hover:bg-rose-950 font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Manage all Posts
          </Button>
        )}
      </div>

      {session.user.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name}
          width={96}
          height={96}
          className="border border-primary rounded-full object-cover"
        />
      ) : (
        <div className="size-18 border border-primary rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <span className="uppercase text-lg font-bold">
            {session.user.name.slice(0,2)}
          </span>
        </div>
      )}

      <pre className="text-sm overflow-clip">
        {JSON.stringify(session, null, 2)}
      </pre>
      <div className="space-y-4 p-4 rounded-b-md border border-t-8 border-rose-800">
        <h2 className="text-2xl font-bold">Update User</h2>
        <UpdateUserForm name={session.user.name} image={session.user.image ?? ""} />
      </div>
      <div className="space-y-4 p-4 rounded-b-md border border-t-8 border-rose-800">
        <h2 className="text-2xl font-bold">Change Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}