// src/app/auditor/users/[id]/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
// Removed unused 'notFound' and 'Link'
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, AuditStatus, Observation } from "@/generated/prisma";
// Removed unused server actions
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilePlus } from "lucide-react"; // Removed unused 'Eye' and 'ListChecks'

// --- PLACEHOLDER COMPONENTS ---
// Removed unused props from placeholders
const CreateAuditForm = () => (
    <Card>
        <CardHeader>
            <CardTitle>Start New Audit</CardTitle>
            <CardDescription>Fill in the details to begin a new audit for this agency.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Form fields for auditDate, auditorName, auditorEmployeeId, location, remarks */}
            {/* Pass agencyId, auditorId, firmId implicitly or explicitly to the action call */}
            <p className="text-muted-foreground">[Form to create audit using createAuditAction - Needs Implementation]</p>
            <Button disabled>Start Audit</Button>
        </CardContent>
    </Card>
);

const AddObservationForm = () => ( // Removed unused auditId prop
     <Card>
        <CardHeader>
            <CardTitle>Add Observation</CardTitle>
        </CardHeader>
        <CardContent>
            {/* Form fields for observationNumber, category, severity, description, evidenceRequired */}
            {/* Pass auditId implicitly or explicitly to the action call */}
            <p className="text-muted-foreground">[Form to add observation using addObservationAction - Needs Implementation]</p>
            <Button disabled><FilePlus className="mr-2 h-4 w-4" /> Add Observation</Button>
        </CardContent>
    </Card>
);

const AuditObservationsList = ({ observations }: { observations: Observation[] }) => ( // Use Observation type
    <Card>
        <CardHeader>
            <CardTitle>Observations</CardTitle>
        </CardHeader>
        <CardContent>
            {observations.length === 0 ? (
                <p className="text-muted-foreground">No observations added yet.</p>
            ) : (
                <ul className="space-y-3">
                    {observations.map((obs) => ( // obs is now typed
                        <li key={obs.id} className="border p-3 rounded-md">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{obs.observationNumber} - {obs.category}</span>
                                <Badge variant={obs.severity === 'HIGH' || obs.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                                    {obs.severity}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{obs.description}</p>
                             <p className="text-xs text-muted-foreground mt-2">Status: {obs.status}</p>
                            {/* Add link/button to view observation details if needed */}
                        </li>
                    ))}
                </ul>
            )}
        </CardContent>
    </Card>
);
// --- END PLACEHOLDER COMPONENTS ---


interface AuditorAgencyAuditPageProps {
  params: {
    id: string; // This is the Agency ID (User ID)
  };
}

export default async function AuditorAgencyAuditPage({ params }: AuditorAgencyAuditPageProps) {
  const agencyId = params.id;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.AUDITOR) {
    redirect("/auth/login");
  }

  // 1. Verify the auditor profile and get firm ID
  const auditor = await prisma.auditor.findUnique({
    where: { userId: session.user.id },
    include: { firm: true },
  });

  if (!auditor) {
    return (
        <div className="container mx-auto p-8 text-center">
            <p className="text-red-600">Auditor profile not found.</p>
            <ReturnButton href="/auditor/dashboard" label="Back to Dashboard" />
        </div>
    );
  }
  const firmId = auditor.firmId;

  // 2. Verify agency is assigned to this auditor's firm
   const assignment = await prisma.agencyAssignment.findUnique({
      where: {
        agencyId_firmId: { agencyId, firmId },
        isActive: true,
      },
       include: { agency: { select: { name: true, email: true } } }
    });

    if (!assignment) {
        return (
            <div className="container mx-auto p-8 text-center">
                <p className="text-red-600">Agency not assigned to your firm or is inactive.</p>
                <ReturnButton href="/auditor/dashboard" label="Back to Dashboard" />
            </div>
        );
    }
    const agency = assignment.agency;

   // 3. Find the most recent audit for this agency by this firm
   const latestAudit = await prisma.audit.findFirst({
       where: {
           agencyId: agencyId,
           firmId: firmId,
       },
       orderBy: { createdAt: 'desc' },
       include: {
           observations: { orderBy: { createdAt: 'desc' } }
       }
   });


  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-6 py-12 max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Audit: {agency.name}
            </h1>
            <p className="text-gray-600 mt-1">Agency Email: {agency.email}</p>
            <p className="text-gray-600">Auditing Firm: {auditor.firm.name}</p>
          </div>
          <ReturnButton href="/auditor/dashboard" label="Back to Dashboard" />
        </div>

        {/* Audit Details Section */}
        {latestAudit ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Current Audit (ID: ...{latestAudit.id.slice(-6)})</CardTitle>
                 <Badge>{latestAudit.status}</Badge>
              </div>
              <CardDescription>
                Started on: {new Date(latestAudit.auditDate).toLocaleDateString()} by {latestAudit.auditorName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               {latestAudit.location && <p className="text-sm"><strong>Location:</strong> {latestAudit.location}</p>}
               {latestAudit.remarks && <p className="text-sm"><strong>Initial Remarks:</strong> {latestAudit.remarks}</p>}

               <AuditObservationsList observations={latestAudit.observations} />

               {latestAudit.status === AuditStatus.IN_PROGRESS && (
                 <AddObservationForm /> // Removed auditId prop
               )}

                 {latestAudit.status === AuditStatus.IN_PROGRESS && (
                    <div className="pt-4 border-t">
                        <Button disabled>Complete Audit (Not Implemented)</Button>
                    </div>
                )}
            </CardContent>
          </Card>
        ) : (
          <CreateAuditForm /> // Removed props
        )}

      </div>
    </div>
  );
}