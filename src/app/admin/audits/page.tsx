import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserRole, AuditStatus } from "@/generated/prisma"; // Import AuditStatus
import { getAuditReviewQueueAction } from "@/actions/audit-review.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, FileCheck2, FileClock, Search } from "lucide-react"; // Import new icons

// Helper function to determine badge style based on status
const getStatusBadge = (status: AuditStatus, hasScorecard: boolean) => {
  if (status === AuditStatus.COMPLETED && !hasScorecard) {
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-400 bg-yellow-50">
        <FileClock className="h-3 w-3 mr-1" />
        Pending Review
      </Badge>
    );
  }
  if (status === AuditStatus.CLOSED || hasScorecard) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <FileCheck2 className="h-3 w-3 mr-1" />
        Scored & Closed
      </Badge>
    );
  }
  if (status === AuditStatus.IN_PROGRESS) {
    return (
      <Badge variant="secondary" className="text-blue-600 border-blue-200 bg-blue-50">
        <Search className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    );
  }
  // Default fallback
  return <Badge variant="outline">{status}</Badge>;
};

// Helper function to determine the correct action button
const getActionButton = (audit: { id: string, status: AuditStatus, scorecard: { id: string } | null }) => {
  if (audit.status === AuditStatus.COMPLETED && !audit.scorecard) {
    return (
      <Button asChild size="sm">
        <Link href={`/admin/audits/${audit.id}`}>
          Review & Score <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    );
  }
  if (audit.status === AuditStatus.CLOSED || audit.scorecard) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/audits/${audit.id}`}>
          View Scorecard <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    );
  }
  if (audit.status === AuditStatus.IN_PROGRESS) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/audits/${audit.id}`}>
          View Details
        </Link>
      </Button>
    );
  }
  return null;
};


export default async function AuditManagementPage() { // Renamed component for clarity
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    redirect("/auth/login");
  }

  const { audits, error } = await getAuditReviewQueueAction();

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/admin/dashboard" label="Back to Dashboard" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-6xl space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Audit Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review all audits, track their status, and publish scorecards.
            </p>
          </div>
          <ReturnButton 
            href={session.user.role === "SUPER_ADMIN" ? "/super/dashboard" : "/admin/dashboard"} 
            label="Back to Dashboard" 
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Audits ({audits?.length || 0})</CardTitle>
            <CardDescription>
              This list includes all audits: In Progress, Pending Review, and Closed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Auditing Firm</TableHead>
                  <TableHead>Auditor Name</TableHead>
                  <TableHead>Audit Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits && audits.length > 0 ? (
                  audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.agency.name}</TableCell>
                      <TableCell>{audit.firm.name}</TableCell>
                      <TableCell>{audit.auditorName}</TableCell>
                      <TableCell>{new Date(audit.auditDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {getStatusBadge(audit.status, !!audit.scorecard)}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* We cast to `any` here because TS can't infer the added `scorecard` property */}
                        {getActionButton({ id: audit.id, status: audit.status, scorecard: audit.scorecard })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <FileCheck2 className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="mt-2 text-muted-foreground">No audits found in the system.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}