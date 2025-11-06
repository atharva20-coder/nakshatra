// src/app/super/auditing-firms/register/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { AuditorRegistrationForm } from "@/components/super-admin/auditor-registration-form";
import { Card } from "@/components/ui/card";

export default async function RegisterAuditorPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-5xl space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Register New Auditing Firm
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete the form below to register a new auditing firm and create login credentials for their key person.
            </p>
          </div>
          <ReturnButton href="/super/auditing-firms" label="Back to Firms List" />
        </div>

        <AuditorRegistrationForm />
      </div>
    </div>
  );
}