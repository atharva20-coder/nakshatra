import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getShowCauseNoticeDetailsAction } from "@/actions/show-cause-notice.action";
import { PageHeader } from "@/components/agency-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ShowCauseNoticeClient } from "@/components/show-cause-notice-client";

// ✅ FIX: params is now a Promise, as per Next.js App Router spec
interface PageProps {
  params: Promise<{ id: string }>;
}

// --- Extract the successful return type from the action ---
type ShowCauseDetailsReturn = Awaited<ReturnType<typeof getShowCauseNoticeDetailsAction>>;
type SuccessData = Extract<ShowCauseDetailsReturn, { success: true }>["data"];
type NoticeType = SuccessData["notice"];

export default async function ShowCauseNoticePage({ params }: PageProps) {
  const { id } = await params; // ✅ FIX: params must be awaited
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/auth/login");
  }

  const result = await getShowCauseNoticeDetailsAction(id);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader />
        <div className="container mx-auto p-8">
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const { notice, isAdmin } = result.data as { notice: NoticeType; isAdmin: boolean };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader />
      <div className="container mx-auto p-8 space-y-8">
        <ShowCauseNoticeClient 
          notice={notice as NoticeType} 
          isAgencyView={!isAdmin} 
        />
      </div>
    </div>
  );
}
