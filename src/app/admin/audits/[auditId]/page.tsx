// src/app/admin/audits/[auditId]/page.tsx
import { getAuditDetailsForAdminAction } from "@/actions/audit-management.action";
import { ObservationListAdmin } from "@/components/admin/ObservationListAdmin";
import { ScorecardForm } from "@/components/admin/ScorecardForm";
import { ReturnButton } from "@/components/return-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, Calendar, User } from "lucide-react";

interface PageProps {
  params: Promise<{ auditId: string }>;
}

export default async function AdminAuditDetailPage({ params }: PageProps) {
  const { auditId } = await params;
  const result = await getAuditDetailsForAdminAction(auditId);

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/admin/audits" label="Back to Audits" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result.error || "Audit not found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const audit = result.data;

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Audit Management</h1>
          <p className="text-muted-foreground mt-1">
            Review observations, issue Show Cause Notices, and publish scorecards
          </p>
        </div>
        <ReturnButton href="/admin/audits" label="Back to Audits" />
      </div>

      {/* Audit Summary Card */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Audit Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Agency</p>
              <p className="font-semibold text-gray-900">{audit.agency.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Auditing Firm</p>
              <p className="font-semibold text-gray-900">{audit.firm?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Individual Auditor
              </p>
              <p className="font-semibold text-gray-900">
                {audit.auditorName || audit.auditor?.user?.name || 'N/A'}
              </p>
              {audit.auditorEmployeeId && (
                <p className="text-xs text-gray-500">ID: {audit.auditorEmployeeId}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Audit Date
              </p>
              <p className="font-semibold text-gray-900">
                {new Date(audit.auditDate).toLocaleDateString()}
              </p>
              <Badge variant="outline" className="mt-1">
                {audit.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observations Section (with SCN Issuance) */}
      <ObservationListAdmin initialAudit={audit} />

      {/* Scorecard Section */}
      <div className="border-t-4 border-gray-200 pt-8">
        <h2 className="text-2xl font-bold mb-6">Audit Scorecard</h2>
        <ScorecardForm auditId={audit.id} initialData={audit.scorecard} />
      </div>
    </div>
  );
}