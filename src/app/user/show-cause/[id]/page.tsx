// src/app/user/show-cause/[id]/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getShowCauseNoticeDetailsAction } from "@/actions/show-cause-notice.action";
import { PageHeader } from "@/components/agency-page-header"; // Use new unified header
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ShowCauseNoticeClient } from "@/components/show-cause-notice-client";

interface PageProps {
  params: { id: string }; // Corrected params type
}

// Extract the successful return type from the action
type ShowCauseDetailsReturn = Awaited<ReturnType<typeof getShowCauseNoticeDetailsAction>>;
// Extract the 'data' object from the successful return type
type SuccessData = Extract<ShowCauseDetailsReturn, { success: true }>["data"];
// Get the type for the notice itself
type NoticeType = SuccessData["notice"];


export default async function ShowCauseNoticePage({ params }: PageProps) {
  const { id } = params; // Corrected: `params` is not a promise
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  
  if (!session) {
    redirect("/auth/login");
  }

  const result = await getShowCauseNoticeDetailsAction(id);

  // --- THIS IS THE FIX ---
  // Handle the error case first
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

  // `result.data` is now guaranteed to exist
  const { notice, isAdmin } = result.data as { notice: NoticeType; isAdmin: boolean };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader />
      <div className="container mx-auto p-8 space-y-8">
        <ShowCauseNoticeClient 
          notice={notice as NoticeType} // Pass the defined notice
          isAgencyView={!isAdmin} // Pass the boolean
        />
      </div>
    </div>
  );
}