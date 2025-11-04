// src/app/auditor/agencies/[agencyId]/page.tsx
import { getAgencyAuditHistoryAction } from "@/actions/auditor.action";
import { AgencyAuditClient } from "@/components/audit/AgencyAuditClient";
import { PageHeader } from "@/components/agency-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AgencyAuditPageProps {
  params: Promise<{ // <-- FIX: Wrap in Promise
    agencyId: string;
  }>;
}

export default async function AgencyAuditPage({ params }: AgencyAuditPageProps) {
  const { agencyId } = await params; // <-- FIX: Await the params

  const result = await getAgencyAuditHistoryAction(agencyId);

  if (result.error) {
    return (
      <div className="container mx-auto p-8">
        <PageHeader returnHref="/auditor/dashboard" returnLabel="Back to Dashboard" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <PageHeader returnHref="/auditor/dashboard" returnLabel="Back to Dashboard" />
      <AgencyAuditClient 
        agency={result.agency!} 
        audits={result.audits || []} 
      />
    </div>
  );
}