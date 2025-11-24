import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getShowCauseNoticeDetailsAction } from "@/actions/show-cause-notice.action";
import { ReturnButton } from "@/components/return-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ShowCauseNoticeClient from "@/components/show-cause-notice-client";
import type {
  ShowCauseNotice,
  Observation,
  Penalty,
  ShowCauseResponse,
  Audit,
  Auditor,
} from "@/generated/prisma";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type ObservationWithAuditDetails = Observation & {
  penalty: Penalty | null;
  audit: (Audit & {
    firm: { name: string } | null;
    auditor: (Auditor & {
      user: { name: string } | null;
    }) | null;
  }) | null;
  _count: { comments: number };
};

type NoticeWithRelations = ShowCauseNotice & {
  issuedByAdmin: { name: string | null } | null;
  receivedByAgency: { name: string | null } | null;
  observations: ObservationWithAuditDetails[];
  responses: (ShowCauseResponse & { author: { name: string | null } | null })[];
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/* -------------------------------------------------------------------------- */
/*                               SERVER COMPONENT                             */
/* -------------------------------------------------------------------------- */

export default async function AdminShowCauseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (
    !session ||
    (session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN)
  ) {
    redirect("/auth/login");
  }

  const result = await getShowCauseNoticeDetailsAction(id);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-8">
          <ReturnButton href="/admin/audits" label="Back to Audits" />
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // ✅ FIXED: Properly typed instead of using `any`
  const data = result.data as { notice: NoticeWithRelations; isAdmin: boolean };
  const { notice } = data;

  /* -------------------------------------------------------------------------- */
  /*                                  CLIENT UI                                */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Show Cause Notice Review</h1>
            <p className="text-muted-foreground mt-1">
              Review agency responses and assign penalties
            </p>
          </div>
          <ReturnButton href="/admin/audits" label="Back to Audits" />
        </div>

        <ShowCauseNoticeClient notice={notice} isAgencyView={false} />
      </div>
    </div>
  );
}
