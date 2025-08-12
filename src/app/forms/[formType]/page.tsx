import { PageHeader } from "@/components/agency-page-header";
import { AgencyVisitForm } from "@/components/forms/AgencyVisitForm";
import { AssetManagementForm } from "@/components/forms/AssetManagementForm";
import { CodeOfConductForm } from "@/components/forms/CodeOfConductForm";
import { DeclarationCumUndertakingForm } from "@/components/forms/DeclarationCumUndertakingForm";
import { EscalationDetailsForm } from "@/components/forms/EscalationDetailsForm";
import { ManpowerRegisterForm } from "@/components/forms/ManpowerRegisterForm";
import { MonthlyComplianceForm } from "@/components/forms/MonthlyComplianceForm";
import { PaymentRegisterForm } from "@/components/forms/PaymentRegisterForm";
import { PenaltyMatrixForm } from "@/components/forms/PenaltyMatrixForm";
import { ProactiveEscalationForm } from "@/components/forms/ProactiveEscalationForm";
import { ProductDeclarationForm } from "@/components/forms/ProductDeclarationForm";
import { RepoKitTrackerForm } from "@/components/forms/RepoKitTrackerForm";
import { TelephoneDeclarationForm } from "@/components/forms/TelephoneDeclarationForm";
import { TrainingTrackerForm } from "@/components/forms/TrainingTrackerForm";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { notFound } from "next/navigation";

interface NewFormPageProps {
    params: {
        formType: FormType;
    }
}

const renderForm = (formType: FormType) => {
    switch (formType) {
        case 'agencyVisits':
            return <AgencyVisitForm />;
        case 'codeOfConduct':
            return <CodeOfConductForm />;
        case 'declarationCumUndertaking':
            return <DeclarationCumUndertakingForm />;
        case 'monthlyCompliance':
            return <MonthlyComplianceForm />;
        case 'assetManagement':
            return <AssetManagementForm />;
        case 'telephoneDeclaration':
            return <TelephoneDeclarationForm />;
        case 'manpowerRegister':
            return <ManpowerRegisterForm />;
        case 'productDeclaration':
            return <ProductDeclarationForm />;
        case 'penaltyMatrix':
            return <PenaltyMatrixForm />;
        case 'trainingTracker':
            return <TrainingTrackerForm />;
        case 'proactiveEscalation':
            return <ProactiveEscalationForm />;
        case 'escalationDetails':
            return <EscalationDetailsForm />;
        case 'paymentRegister':
            return <PaymentRegisterForm />;
        case 'repoKitTracker':
            return <RepoKitTrackerForm />;
        default:
            notFound();
    }
}

// The component is now async to correctly handle the params prop.
export default async function NewFormPage({ params }: NewFormPageProps) {
  const { formType } = params;

  if (!(formType in FORM_CONFIGS)) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />
      <main className="p-8">
        <div className="container mx-auto">
          {renderForm(formType)}
        </div>
      </main>
    </div>
  );
}
