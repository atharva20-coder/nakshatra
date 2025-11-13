// src/app/super/announcements/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { getAllAnnouncementsForSuperAdminAction } from "@/actions/scheduled-announcement.action";
import { ScheduledAnnouncementManager } from "@/components/super-admin/ScheduledAnnouncementManager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

export default async function AnnouncementsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const result = await getAllAnnouncementsForSuperAdminAction();

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
            <p className="text-gray-600 mt-1">Create, schedule, and manage global advisories.</p>
          </div>
          <ReturnButton href="/super/dashboard" label="Back to Dashboard" />
        </div>

        {/* Information Banner */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Scheduling Feature</AlertTitle>
          <AlertDescription className="text-blue-800">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Publish Now:</strong> Announcement appears immediately on all dashboards</li>
              <li><strong>Schedule for Later:</strong> Set a future date and time for automatic publishing</li>
              <li><strong>Auto-Publishing:</strong> Scheduled announcements are published automatically every 10 minutes</li>
              <li><strong>Cancel:</strong> Remove scheduled announcements before they publish</li>
              <li><strong>Publish Early:</strong> Manually publish scheduled announcements before their time</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <ScheduledAnnouncementManager initialAnnouncements={result.data} />
      </div>
    </div>
  );
}