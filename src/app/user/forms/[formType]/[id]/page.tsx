// src/app/user/forms/[formType]/[id]/page.tsx
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/agency-page-header";
import { AgencyVisitForm } from "@/components/forms/AgencyVisitForm";
import { AssetManagementForm } from "@/components/forms/AssetManagementForm";
import { DeclarationCumUndertakingForm } from "@/components/forms/DeclarationCumUndertakingForm";
import { TelephoneDeclarationForm } from "@/components/forms/TelephoneDeclarationForm";
import { ManpowerRegisterForm } from "@/components/forms/ManpowerRegisterForm";
import { ProductDeclarationForm } from "@/components/forms/ProductDeclarationForm";
import { ProactiveEscalationForm } from "@/components/forms/ProactiveEscalationForm";
import { PaymentRegisterForm } from "@/components/forms/PaymentRegisterForm";
import { CodeOfConductForm } from "@/components/forms/CodeOfConductForm";
import { EscalationDetailsForm } from "@/components/forms/EscalationDetailsForm"; // Import new form
import { RepoKitTrackerForm } from "@/components/forms/RepoKitTrackerForm"; // Import RepoKit

import { getCodeOfConductById } from "@/actions/code-of-conduct.action";
import { getAgencyVisitById } from "@/actions/agency-visit.action";
import { getAssetManagementById } from "@/actions/asset-management.action";
import { getDeclarationById } from "@/actions/declaration-cum-undertaking.action";
import { getTelephoneDeclarationById } from "@/actions/telephone-declaration.action";
import { getManpowerRegisterById } from "@/actions/manpower-register.action";
import { getProductDeclarationById } from "@/actions/product-declaration.action";
import { getProactiveEscalationById } from "@/actions/proactive-escalation.action";
import { getPaymentRegisterById } from "@/actions/payment-register.action";
import { getEscalationDetailsById } from "@/actions/escalation-details.action"; // Import new action
import { getRepoKitTrackerById } from "@/actions/repo-kit-tracker.action"; // Import RepoKit action
import { getMonthlyComplianceById } from "@/actions/monthly-compliance.action"; // <-- ADD IMPORT
import { MonthlyComplianceForm } from "@/components/forms/MonthlyComplianceForm";
import { FORM_CONFIGS } from "@/types/forms";

type FormType = keyof typeof FORM_CONFIGS;

interface EditFormPageProps {
  params: Promise<{
    formType: FormType;
    id: string;
  }>;
}

const renderForm = async (formType: FormType, id: string) => {
    switch (formType) {
        case 'codeOfConduct': {
            const submission = await getCodeOfConductById(id);
            if (!submission) notFound();
            return <CodeOfConductForm initialData={submission} />;
        }
        case 'agencyVisits': {
            const submission = await getAgencyVisitById(id);
            if (!submission) notFound();
            return <AgencyVisitForm initialData={submission} />;
        }
        case 'declarationCumUndertaking': {
            const submission = await getDeclarationById(id);
            if (!submission) notFound();
            return <DeclarationCumUndertakingForm initialData={submission} />;
        }
        // --- ADD NEW CASE ---
        case 'monthlyCompliance': {
            const submission = await getMonthlyComplianceById(id);
            if (!submission) notFound();
            return <MonthlyComplianceForm initialData={submission} />;
        }
        // --- END NEW CASE ---
        case 'assetManagement': {
            const submission = await getAssetManagementById(id);
            if (!submission) notFound();
            return <AssetManagementForm initialData={submission} />;
        }
        case 'telephoneDeclaration': {
            const submission = await getTelephoneDeclarationById(id);
            if (!submission) notFound();
            return <TelephoneDeclarationForm initialData={submission} />;
        }
        case 'manpowerRegister': {
            const submission = await getManpowerRegisterById(id);
            if (!submission) notFound();
            return <ManpowerRegisterForm initialData={submission} />;
        }
        case 'productDeclaration': {
            const submission = await getProductDeclarationById(id);
            if (!submission) notFound();
            return <ProductDeclarationForm initialData={submission} />;
        }
        case 'proactiveEscalation': {
            const submission = await getProactiveEscalationById(id);
            if (!submission) notFound();
            return <ProactiveEscalationForm initialData={submission} />;
        }
        case 'paymentRegister': {
            const submission = await getPaymentRegisterById(id);
            if (!submission) notFound();
            return <PaymentRegisterForm initialData={submission} />;
        }
        case 'repoKitTracker': { // Add RepoKit case
            const submission = await getRepoKitTrackerById(id);
            if (!submission) notFound();
            return <RepoKitTrackerForm initialData={submission} />;
        }
        case 'escalationDetails': { // Add new case
            const submission = await getEscalationDetailsById(id);
            if (!submission) notFound();
            return <EscalationDetailsForm initialData={submission} />;
        }
        // Add other forms as needed
        default:
            notFound();
    }
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const { formType, id } = await params;

  if (!(formType in FORM_CONFIGS)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
      <main className="p-8">
        <div className="container mx-auto">
          {await renderForm(formType, id)}
        </div>
      </main>
    </div>
  );
}