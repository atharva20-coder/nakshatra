// src/app/auditor/agencies/[agencyId]/audit/[auditId]/page.tsx
import { getAuditObservationDataAction } from "@/actions/auditor.action";
import { PageHeader } from "@/components/agency-page-header";
import { ObservationForm } from "@/components/audit/ObservationForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import React from "react";

interface AuditObservationPageProps {
  params: Promise<{ // <-- FIX: Wrap in Promise to match your project's pattern
    agencyId: string;
    auditId: string;
  }>;
}

export default async function AuditObservationPage({ params }: AuditObservationPageProps) {
  const { agencyId, auditId } = await params; // <-- FIX: Await the params
  
  const result = await getAuditObservationDataAction(auditId);

  if (result.error) {
    return (
      <div className="container mx-auto p-8">
        <PageHeader 
            returnHref={`/auditor/agencies/${agencyId}`} 
            returnLabel="Back to Agency" 
        />
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
        <PageHeader 
            returnHref={`/auditor/agencies/${agencyId}`} 
            returnLabel={`Back to ${result.audit!.agency.name}`} 
        />
        <ObservationForm 
            audit={result.audit!}
            initialObservations={result.audit!.observations || []}
        />
    </div>
  );
}