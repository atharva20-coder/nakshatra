// src/app/admin/audits/[auditId]/page.tsx
import { getAuditForAdminAction } from "@/actions/audit-management.action";
import { ScorecardForm } from "@/components/admin/ScorecardForm";
import { ReturnButton } from "@/components/return-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ auditId: string }>;
}

export default async function AdminAuditReviewPage({ params }: PageProps) {
  const { auditId } = await params;
  const { audit, error } = await getAuditForAdminAction(auditId);

  if (error || !audit) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/admin/dashboard" label="Back to Dashboard" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Audit not found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Review & Scorecard</h1>
          <p className="text-muted-foreground">
            Review observations for <strong>{audit.agency.name}</strong> and publish the final scorecard.
          </p>
        </div>
        <ReturnButton href="/admin/dashboard" label="Back to Dashboard" />
      </div>

      {/* Observations (Read-Only) */}
      <Card>
        <CardHeader>
          <CardTitle>Observations from {audit.firm.name}</CardTitle>
          <CardDescription>
            Audit conducted by {audit.auditorName} on {new Date(audit.auditDate).toLocaleDateString()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obs. #</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.observations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No observations were recorded for this audit.
                  </TableCell>
                </TableRow>
              ) : (
                audit.observations.map(obs => (
                  <TableRow key={obs.id}>
                    <TableCell>{obs.observationNumber}</TableCell>
                    <TableCell>{obs.category}</TableCell>
                    <TableCell>{obs.severity}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{obs.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scorecard Form */}
      <ScorecardForm auditId={audit.id} initialData={audit.scorecard} />
    </div>
  );
}