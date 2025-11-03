// src/app/admin/forms/[formType]/[id]/page.tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { FORM_CONFIGS } from "@/types/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Import ALL Form Components
import { AgencyVisitForm } from "@/components/forms/AgencyVisitForm";
import { AssetManagementForm } from "@/components/forms/AssetManagementForm";
import { CodeOfConductForm } from "@/components/forms/CodeOfConductForm";
import { DeclarationCumUndertakingForm } from "@/components/forms/DeclarationCumUndertakingForm";
import { EscalationDetailsForm } from "@/components/forms/EscalationDetailsForm"; // Uncommented
import { ManpowerRegisterForm } from "@/components/forms/ManpowerRegisterForm";
// import { MonthlyComplianceForm } from "@/components/forms/MonthlyComplianceForm";
import { PaymentRegisterForm } from "@/components/forms/PaymentRegisterForm";
// import { PenaltyMatrixForm } from "@/components/forms/PenaltyMatrixForm";
import { ProactiveEscalationForm } from "@/components/forms/ProactiveEscalationForm";
import { ProductDeclarationForm } from "@/components/forms/ProductDeclarationForm";
import { RepoKitTrackerForm } from "@/components/forms/RepoKitTrackerForm";
import { TelephoneDeclarationForm } from "@/components/forms/TelephoneDeclarationForm";
// import { TrainingTrackerForm } from "@/components/forms/TrainingTrackerForm";

// Import ALL Admin Fetch Actions
import { getAgencyVisitByIdForAdmin } from "@/actions/agency-visit.action";
import { getAssetManagementByIdForAdmin } from "@/actions/asset-management.action";
import { getCodeOfConductByIdForAdmin } from "@/actions/code-of-conduct.action";
import { getDeclarationByIdForAdmin } from "@/actions/declaration-cum-undertaking.action";
import { getEscalationDetailsByIdForAdmin } from "@/actions/escalation-details.action"; // Uncommented
import { getManpowerRegisterByIdForAdmin } from "@/actions/manpower-register.action";
// import { getMonthlyComplianceByIdForAdmin } from "@/actions/monthly-compliance.action";
import { getPaymentRegisterByIdForAdmin } from "@/actions/payment-register.action";
// import { getPenaltyMatrixByIdForAdmin } from "@/actions/penalty-matrix.action";
import { getProactiveEscalationByIdForAdmin } from "@/actions/proactive-escalation.action";
import { getProductDeclarationByIdForAdmin } from "@/actions/product-declaration.action";
import { getRepoKitTrackerByIdForAdmin } from "@/actions/repo-kit-tracker.action";
import { getTelephoneDeclarationByIdForAdmin } from "@/actions/telephone-declaration.action";
// import { getTrainingTrackerByIdForAdmin } from "@/actions/training-tracker.action";

type FormType = keyof typeof FORM_CONFIGS;

interface AdminViewFormPageProps {
  params: Promise<{
    formType: FormType;
    id: string;
  }>;
}

// Function to fetch data and render the correct form component
const renderAdminFormView = async (formType: FormType, id: string) => {
  let submission: Awaited<ReturnType<typeof getCodeOfConductByIdForAdmin>> |
                  Awaited<ReturnType<typeof getAgencyVisitByIdForAdmin>> |
                  Awaited<ReturnType<typeof getDeclarationByIdForAdmin>> |
                  Awaited<ReturnType<typeof getAssetManagementByIdForAdmin>> |
                  Awaited<ReturnType<typeof getTelephoneDeclarationByIdForAdmin>> |
                  Awaited<ReturnType<typeof getManpowerRegisterByIdForAdmin>> |
                  Awaited<ReturnType<typeof getProductDeclarationByIdForAdmin>> |
                  Awaited<ReturnType<typeof getProactiveEscalationByIdForAdmin>> |
                  Awaited<ReturnType<typeof getPaymentRegisterByIdForAdmin>> |
                  Awaited<ReturnType<typeof getRepoKitTrackerByIdForAdmin>> |
                  Awaited<ReturnType<typeof getEscalationDetailsByIdForAdmin>> | // Added new type
                  null = null;

  // Call the appropriate ADMIN fetch action based on formType
  switch (formType) {
    case 'codeOfConduct':
        submission = await getCodeOfConductByIdForAdmin(id);
        if (!submission) notFound();
        return <CodeOfConductForm initialData={submission} isAdminView={true} />;
    case 'agencyVisits':
        submission = await getAgencyVisitByIdForAdmin(id);
        if (!submission) notFound();
        return <AgencyVisitForm initialData={submission} isAdminView={true} />;
    case 'declarationCumUndertaking':
        submission = await getDeclarationByIdForAdmin(id);
        if (!submission) notFound();
        return <DeclarationCumUndertakingForm initialData={submission} isAdminView={true} />;
    case 'assetManagement':
        submission = await getAssetManagementByIdForAdmin(id);
        if (!submission) notFound();
        return <AssetManagementForm initialData={submission} isAdminView={true} />;
    case 'telephoneDeclaration':
        submission = await getTelephoneDeclarationByIdForAdmin(id);
        if (!submission) notFound();
        return <TelephoneDeclarationForm initialData={submission} isAdminView={true} />;
    case 'manpowerRegister':
        submission = await getManpowerRegisterByIdForAdmin(id);
        if (!submission) notFound();
        return <ManpowerRegisterForm initialData={submission} isAdminView={true} />;
    case 'productDeclaration':
        submission = await getProductDeclarationByIdForAdmin(id);
        if (!submission) notFound();
        return <ProductDeclarationForm initialData={submission} isAdminView={true} />;
    case 'proactiveEscalation':
        submission = await getProactiveEscalationByIdForAdmin(id);
        if (!submission) notFound();
        return <ProactiveEscalationForm initialData={submission} isAdminView={true} />;
    case 'paymentRegister':
        submission = await getPaymentRegisterByIdForAdmin(id);
        if (!submission) notFound();
        return <PaymentRegisterForm initialData={submission} isAdminView={true} />;
    case 'repoKitTracker':
        submission = await getRepoKitTrackerByIdForAdmin(id);
        if (!submission) notFound();
        return <RepoKitTrackerForm initialData={submission} isAdminView={true} />;
    case 'escalationDetails': // Uncommented
      submission = await getEscalationDetailsByIdForAdmin(id);
      if (!submission) notFound();
      return <EscalationDetailsForm initialData={submission} isAdminView={true} />;
    // --- ADD CASES FOR THE REMAINING FORMS ---
    // case 'monthlyCompliance':
    //   submission = await getMonthlyComplianceByIdForAdmin(id);
    //   if (!submission) notFound();
    //   return <MonthlyComplianceForm initialData={submission} isAdminView={true} />;
    // case 'penaltyMatrix':
    //   submission = await getPenaltyMatrixByIdForAdmin(id);
    //   if (!submission) notFound();
    //   return <PenaltyMatrixForm initialData={submission} isAdminView={true} />;
    // case 'trainingTracker':
    //   submission = await getTrainingTrackerByIdForAdmin(id);
    //   if (!submission) notFound();
    //   return <TrainingTrackerForm initialData={submission} isAdminView={true} />;
    default:
        console.error(`Admin view not implemented for form type: ${formType}`);
        notFound();
  }
};

// Helper function to fetch data once to get agency info for the header
async function getFormData(formType: FormType, id: string) {
    // This needs to call the correct admin fetch action based on formType
    switch (formType) {
        case 'codeOfConduct': return await getCodeOfConductByIdForAdmin(id);
        case 'agencyVisits': return await getAgencyVisitByIdForAdmin(id);
        case 'declarationCumUndertaking': return await getDeclarationByIdForAdmin(id);
        case 'assetManagement': return await getAssetManagementByIdForAdmin(id);
        case 'telephoneDeclaration': return await getTelephoneDeclarationByIdForAdmin(id);
        case 'manpowerRegister': return await getManpowerRegisterByIdForAdmin(id);
        case 'productDeclaration': return await getProductDeclarationByIdForAdmin(id);
        case 'proactiveEscalation': return await getProactiveEscalationByIdForAdmin(id);
        case 'paymentRegister': return await getPaymentRegisterByIdForAdmin(id);
        case 'repoKitTracker': return await getRepoKitTrackerByIdForAdmin(id);
        case 'escalationDetails': return await getEscalationDetailsByIdForAdmin(id); // Uncommented
        // --- ADD CASES FOR THE REMAINING FORMS ---
        // case 'monthlyCompliance': return await getMonthlyComplianceByIdForAdmin(id);
        // case 'penaltyMatrix': return await getPenaltyMatrixByIdForAdmin(id);
        // case 'trainingTracker': return await getTrainingTrackerByIdForAdmin(id);
        default: return null;
    }
}


export default async function AdminViewFormPage({ params }: AdminViewFormPageProps) {
  const { formType, id } = await params;

  // Check permissions
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
     return (
       <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
             <CardHeader>
               <CardTitle className="text-red-600">Access Forbidden</CardTitle>
             </CardHeader>
             <CardContent>
               <p>You do not have permission to view this page.</p>
               <div className="mt-4">
                  <ReturnButton href="/admin/dashboard" label="Back to Admin Dashboard" />
               </div>
             </CardContent>
          </Card>
       </div>
    );
  }

  // Validate formType
  if (!(formType in FORM_CONFIGS)) {
    notFound();
  }

  const formMetadata = FORM_CONFIGS[formType];
  const formData = await getFormData(formType, id); // Fetch data once

  if (!formData) {
    // This handles cases where the form ID is invalid or the admin fetch function failed
    return (
       <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
             <CardHeader>
               <CardTitle className="text-orange-600">Form Not Found</CardTitle>
             </CardHeader>
             <CardContent>
               <p>The requested form submission could not be found or is inaccessible.</p>
               <div className="mt-4">
                  <ReturnButton href="/admin/forms" label="Back to Forms List" />
               </div>
             </CardContent>
          </Card>
       </div>
    );
  }

  const agencyName = formData.agencyInfo?.name || "Agency";
  const agencyUserId = formData.agencyInfo?.userId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header with Return Button */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <ReturnButton href={agencyUserId ? `/admin/users/${agencyUserId}` : '/admin/forms'} label={`Back to ${agencyName}'s Profile`} />
      </div>

      <main className="p-8">
        <div className="container mx-auto">
            {/* Display Agency Info */}
            <Card className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
               <CardHeader>
                 <CardTitle className="text-lg text-blue-800 dark:text-blue-300">Viewing Submission For:</CardTitle>
               </CardHeader>
               <CardContent className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                 <p><strong>Agency:</strong> {formData.agencyInfo?.name ?? 'N/A'}</p>
                 <p><strong>Email:</strong> {formData.agencyInfo?.email ?? 'N/A'}</p>
                 <p><strong>Status:</strong> <Badge variant={formData.status === 'SUBMITTED' ? 'default' : 'secondary'} className={formData.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : ''}>{formData.status}</Badge></p>
               </CardContent>
            </Card>

            {/* Title for the specific form being viewed */}
            <h1 className="text-2xl font-bold mb-4">{formMetadata.title}</h1>

            {/* Render the specific form component in read-only mode */}
            {await renderAdminFormView(formType, id)}
        </div>
      </main>
    </div>
  );
}