// src/app/super/announcements/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { getAnnouncementsForSuperAdminAction } from "@/actions/announcement.action";
import { AnnouncementManager } from "@/components/super-admin/AnnouncementManager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function AnnouncementsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const result = await getAnnouncementsForSuperAdminAction();

  if (!result.success) {
    return (
       <div className="container mx-auto p-8">
        <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
        </Alert>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-7xl space-y-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Announcements</h1>
            <p className="text-gray-600 mt-1">Create and delete global advisories.</p>
          </div>
          <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        </div>
        
        <AnnouncementManager initialAnnouncements={result.data} />
      </div>
    </div>
  );
}