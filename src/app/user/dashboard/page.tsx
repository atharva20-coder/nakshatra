import React from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, AlertCircle, Plus, Edit, ArrowRight } from "lucide-react"; // Import ArrowRight
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { SubmissionStatus } from "@/generated/prisma";
import Link from "next/link";
import { ReturnButton } from "@/components/return-button";
import { getCompletedAuditsForAgency } from "@/actions/agency-actions"; // <-- IMPORT AUDIT ACTION
import { Star } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // <-- IMPORT TABLE COMPONENTS

// Define form table mappings
const FORM_TABLE_MAPPINGS = {
  codeOfConduct: 'codeOfConduct',
  declarationCumUndertaking: 'declarationCumUndertaking',
  agencyVisits: 'agencyVisit',
  monthlyCompliance: 'monthlyCompliance',
  assetManagement: 'assetManagement',
  telephoneDeclaration: 'telephoneDeclaration',
  manpowerRegister: 'agencyManpowerRegister',
  productDeclaration: 'productDeclaration',
  penaltyMatrix: 'agencyPenaltyMatrix',
  trainingTracker: 'agencyTrainingTracker',
  proactiveEscalation: 'proactiveEscalationTracker',
  escalationDetails: 'escalationDetails',
  paymentRegister: 'paymentRegister',
  repoKitTracker: 'repoKitTracker',
  noDuesDeclaration: 'noDuesDeclaration',
} as const;

interface FormStatus {
  formType: FormType;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  formId?: string;
  lastUpdated?: Date;
  isOverdue?: boolean;
}

async function getUserFormStatuses(userId: string): Promise<FormStatus[]> {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const statuses: FormStatus[] = [];

  for (const [formType, config] of Object.entries(FORM_CONFIGS)) {
    try {
      const tableName = FORM_TABLE_MAPPINGS[formType as FormType];
      let form = null;

      // Query the appropriate table based on form type
      switch (formType as FormType) {
        case 'codeOfConduct':
          form = await prisma.codeOfConduct.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'agencyVisits':
          form = await prisma.agencyVisit.findFirst({
            where: { agencyId: userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'declarationCumUndertaking':
          form = await prisma.declarationCumUndertaking.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'monthlyCompliance':
          form = await prisma.monthlyCompliance.findFirst({
            where: { agencyId: userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'assetManagement':
          form = await prisma.assetManagement.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'telephoneDeclaration':
          form = await prisma.telephoneDeclaration.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'manpowerRegister':
          form = await prisma.agencyManpowerRegister.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'productDeclaration':
          form = await prisma.productDeclaration.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'penaltyMatrix':
          form = await prisma.agencyPenaltyMatrix.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'trainingTracker':
          form = await prisma.agencyTrainingTracker.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'proactiveEscalation':
          form = await prisma.proactiveEscalationTracker.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'escalationDetails':
          form = await prisma.escalationDetails.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'paymentRegister':
          form = await prisma.paymentRegister.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'repoKitTracker':
          form = await prisma.repoKitTracker.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
          break;
        case 'noDuesDeclaration':
          form = await prisma.noDuesDeclaration.findFirst({
            where: { agencyId: userId },
            orderBy: { updatedAt: 'desc' }
          });
        break;
      }

      // Determine if form is overdue
      const deadline = new Date(currentYear, currentMonth - 1, config.deadlineDay, 23, 59, 59);
      const isOverdue = new Date() > deadline && (!form || form.status === SubmissionStatus.DRAFT);

      statuses.push({
        formType: formType as FormType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: form ? form.status as any : 'NOT_STARTED',
        formId: form?.id,
        lastUpdated: form?.updatedAt,
        isOverdue: isOverdue && config.isRequired
      });
    } catch (error) {
      console.error(`Error fetching status for ${formType}:`, error);
      statuses.push({
        formType: formType as FormType,
        status: 'NOT_STARTED',
        isOverdue: config.isRequired
      });
    }
  }

  return statuses;
}

function getStatusIcon(status: FormStatus['status']) {
  switch (status) {
    case 'SUBMITTED':
    case 'APPROVED':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'DRAFT':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'REJECTED':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

function getStatusBadge(status: FormStatus['status'], isOverdue?: boolean) {
  if (isOverdue && (status === 'NOT_STARTED' || status === 'DRAFT')) {
    return <Badge variant="destructive">Overdue</Badge>;
  }

  switch (status) {
    case 'SUBMITTED':
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Submitted</Badge>;
    case 'APPROVED':
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    case 'DRAFT':
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Draft</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
}

interface FormCardProps {
  formStatus: FormStatus;
}



function FormCard({ formStatus }: FormCardProps) {
  const config = FORM_CONFIGS[formStatus.formType];
  const hasExistingForm = formStatus.formId && (formStatus.status === 'DRAFT' || formStatus.status === 'SUBMITTED');
  
  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      formStatus.isOverdue ? 'border-red-200 bg-red-50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              {config.title}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {config.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(formStatus.status)}
            {getStatusBadge(formStatus.status, formStatus.isOverdue)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {formStatus.lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {formStatus.lastUpdated.toLocaleDateString()}
            </p>
          )}
          
          <div className="flex gap-2">
            {hasExistingForm ? (
              <>
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/user/forms/${formStatus.formType}/${formStatus.formId}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    {formStatus.status === 'DRAFT' ? 'Continue Editing' : 'View Form'}
                  </Link>
                </Button>
                {formStatus.status === 'DRAFT' && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/user/forms/${formStatus.formType}`}>
                      <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <Button asChild size="sm" className="flex-1">
                <Link href={`/user/forms/${formStatus.formType}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Link>
              </Button>
            )}
          </div>
          
          {config.isRequired && (
            <p className="text-xs text-gray-500">
              Required • Due by {config.deadlineDay}th of each month
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



export default async function Dashboard() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const formStatuses = await getUserFormStatuses(session.user.id);
  
  // --- START: MODIFICATION ---
  const auditResult = await getCompletedAuditsForAgency();
  const completedAudits = auditResult.success ? auditResult.audits : [];
  // --- END: MODIFICATION ---
  
  // Categorize forms
  const requiredForms = formStatuses.filter(f => FORM_CONFIGS[f.formType].isRequired);
  const optionalForms = formStatuses.filter(f => !FORM_CONFIGS[f.formType].isRequired);
  
  // Count statistics
  const totalRequired = requiredForms.length;
  const completedRequired = requiredForms.filter(f => f.status === 'SUBMITTED' || f.status === 'APPROVED').length;
  const overdueRequired = requiredForms.filter(f => f.isOverdue).length;
  const draftsCount = formStatuses.filter(f => f.status === 'DRAFT').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your form submissions and track compliance status
          </p>
        </div><div className="space-y-8">
          <ReturnButton href="/profile" label="Profile" />
          {/* Removed Admin Dashboard title */}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Required Forms
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {completedRequired}/{totalRequired}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Overdue
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {overdueRequired}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Draft Forms
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {draftsCount}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Forms
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formStatuses.length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Forms Alert */}
        {overdueRequired > 0 && (
          <Card className="border-red-200 bg-red-50 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">
                    Attention: {overdueRequired} Overdue Form{overdueRequired > 1 ? 's' : ''}
                  </h3>
                  <p className="text-red-700 text-sm">
                    Please complete your overdue submissions as soon as possible to maintain compliance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* --- START: NEW COMPLETED AUDITS SECTION --- */}
        {completedAudits && completedAudits.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Published Audit Reports
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Audit Date</TableHead>
                      <TableHead>Auditing Firm</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedAudits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell>
                          {new Date(audit.auditDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {audit.firm.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold">
                            {audit.scorecard?.auditScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-rose-100 text-rose-800 font-bold">
                            {audit.scorecard?.auditGrade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/user/audits/${audit.id}`}>
                              View Report <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
        {/* --- END: NEW COMPLETED AUDITS SECTION --- */}

        {/* Required Forms Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Required Forms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requiredForms.map((formStatus) => (
              <FormCard key={formStatus.formType} formStatus={formStatus} />
            ))}
          </div>
        </div>

        {/* Optional Forms Section */}
        {optionalForms.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Optional Forms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {optionalForms.map((formStatus) => (
                <FormCard key={formStatus.formType} formStatus={formStatus} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}