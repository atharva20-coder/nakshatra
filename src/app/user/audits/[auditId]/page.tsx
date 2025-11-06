// src/app/user/audits/[auditId]/page.tsx
import { getScoredAuditForAgency } from "@/actions/auditor.action";
import { PageHeader } from "@/components/agency-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ auditId: string }>;
}

export default async function AgencyAuditScorecardPage({ params }: PageProps) {
  const { auditId } = await params;
  const { audit, error } = await getScoredAuditForAgency(auditId);

  if (error || !audit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
        <div className="container mx-auto p-8">
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || "Audit not found."}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const { scorecard, observations, firm, auditorName, auditDate } = audit;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
      <div className="container mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Audit Scorecard</h1>
          <p className="text-muted-foreground">
            Final score for audit conducted by <strong>{firm.name}</strong> on {new Date(auditDate).toLocaleDateString()}.
          </p>
        </div>

        {/* Scorecard Summary */}
        <Card className="border-t-4 border-rose-800">
          <CardHeader>
            <CardTitle>Final Score: {scorecard!.auditPeriod}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Score</p>
                <p className="text-4xl font-bold text-rose-800">{scorecard!.auditScore}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Grade</p>
                <p className="text-4xl font-bold text-rose-800">{scorecard!.auditGrade}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-4xl font-bold text-rose-800">{scorecard!.auditCategory}</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold">Admin Justification</h4>
                <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md border mt-1">{scorecard!.justification}</p>
              </div>
              <div>
                <h4 className="font-semibold">Final Observation</h4>
                <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md border mt-1">{scorecard!.finalObservation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observations List */}
        <Card>
          <CardHeader>
            <CardTitle>Observations</CardTitle>
            <CardDescription>
              The following observations were sent to you for review during this audit.
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
                  <TableHead>Your Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {observations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No observations were published for this audit.
                    </TableCell>
                  </TableRow>
                ) : (
                  observations.map(obs => (
                    <TableRow key={obs.id}>
                      <TableCell>{obs.observationNumber}</TableCell>
                      <TableCell>{obs.category}</TableCell>
                      <TableCell>
                        <Badge variant={obs.severity === 'HIGH' || obs.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                          {obs.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">{obs.description}</TableCell>
                      <TableCell>
                        {obs.status === 'AGENCY_ACCEPTED' && <Badge className="bg-green-100 text-green-800">Accepted</Badge>}
                        {obs.status === 'AUTO_ACCEPTED' && <Badge className="bg-yellow-100 text-yellow-800">Auto-Accepted</Badge>}
                        {obs.status === 'AGENCY_DISPUTED' && <Badge className="bg-red-100 text-red-800">Disputed</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}