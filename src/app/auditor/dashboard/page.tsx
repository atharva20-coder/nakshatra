// src/app/auditor/dashboard/page.tsx
import { getAuditorDashboardDataAction } from "@/actions/auditor.action";
import { AdvisoryMarquee } from "@/components/AdvisoryMarquee";
import { AuditorDashboardClient } from "@/components/audit/AuditorDashboardClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import React from "react";

export default async function AuditorDashboardPage() {
  const result = await getAuditorDashboardDataAction();

  if (result.error) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <AdvisoryMarquee />
      <h1 className="text-3xl font-bold mb-2">Auditor Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Welcome, <strong>{result.firm?.name}</strong>.
      </p>
      
      <AuditorDashboardClient 
        assignments={result.assignments || []} 
        firmName={result.firm?.name || "your firm"} 
      />
    </div>
  );
}