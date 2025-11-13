import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { getAuditingFirmDetailsAction } from "@/actions/auditor-registration.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { Button } from "@/components/ui/button";
import { Building, User, Mail, Phone, MapPin, Calendar, CheckCircle, Users, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ firmId: string }>;
}

export default async function AuditingFirmDetailsPage({ params }: PageProps) {
  const { firmId } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const { firm, error } = await getAuditingFirmDetailsAction(firmId);

  if (error || !firm) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/super/auditing-firms" label="Back to Firms List" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Firm not found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const keyPerson = firm.auditors[0]?.user;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12 max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <Building className="h-8 w-8" />
              {firm.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Registered on {new Date(firm.createdAt).toLocaleDateString()}
            </p>
          </div>
          <ReturnButton href="/super/auditing-firms" label="Back to Firms List" />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agency Assignments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{firm.agencyAssignments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Agencies currently assigned to this firm
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audits Conducted</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{firm.audits.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time audit records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Firm Details */}
        <Card>
          <CardHeader>
            <CardTitle>Firm Information</CardTitle>
            <CardDescription>Official details of the auditing firm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4 mr-2" />
                  Firm Name
                </div>
                <p className="text-base font-semibold">{firm.name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  Contact Person
                </div>
                <p className="text-base font-semibold">{firm.contactPerson || "N/A"}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Email
                </div>
                <p className="text-base font-semibold">{firm.contactEmail || "N/A"}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Phone
                </div>
                <p className="text-base font-semibold">{firm.contactPhone || "N/A"}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  Address
                </div>
                <p className="text-base font-semibold whitespace-pre-wrap">{firm.address || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Person Details */}
        <Card>
          <CardHeader>
            <CardTitle>Key Person (Login Credentials)</CardTitle>
            <CardDescription>Authorized representative with system access</CardDescription>
          </CardHeader>
          <CardContent>
            {keyPerson ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4 mr-2" />
                      Full Name
                    </div>
                    <p className="text-base font-semibold">{keyPerson.name}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      Email (Login ID)
                    </div>
                    <p className="text-base font-semibold">{keyPerson.email}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Email Verification Status
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {keyPerson.emailVerified ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Account Created
                    </div>
                    <p className="text-base">{new Date(keyPerson.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> The key person can change their password after logging in.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No key person assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Agencies */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Agencies</CardTitle>
            <CardDescription>
              Agencies currently assigned to this auditing firm for audits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {firm.agencyAssignments.length > 0 ? (
              <div className="space-y-2">
                {firm.agencyAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{assignment.agency.name}</p>
                        <p className="text-sm text-muted-foreground">{assignment.agency.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">
                No agencies assigned yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Audits */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Audits</CardTitle>
            <CardDescription>Latest 10 audits conducted by this firm</CardDescription>
          </CardHeader>
          <CardContent>
            {firm.audits.length > 0 ? (
              <div className="space-y-2">
                {firm.audits.map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{audit.agency.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(audit.auditDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{audit.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">
                No audits conducted yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            {/* --- MODIFICATION: Updated Link --- */}
            <Link href={`/super/auditing-firms/assign/${firm.id}`}>
              <Users className="mr-2 h-4 w-4" /> Manage Assignments
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}