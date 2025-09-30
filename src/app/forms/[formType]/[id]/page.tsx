import { notFound } from "next/navigation";
import { PageHeader } from "@/components/agency-page-header";
import { AgencyVisitForm } from "@/components/forms/AgencyVisitForm";
import { CodeOfConductForm } from "@/components/forms/CodeOfConductForm";
import { AssetManagementForm } from "@/components/forms/AssetManagementForm";
//import { MonthlyComplianceForm } from "@/components/forms/MonthlyComplianceForm"; // Added import
import { getAgencyVisitById } from "@/actions/agency-visit.action";
import { getCodeOfConductById } from "@/actions/code-of-conduct.action";
import { getAssetManagementById } from "@/actions/asset-management.action";
//import { getMonthlyComplianceById } from "@/actions/monthly-compliance.action"; // Added import
import { FORM_CONFIGS } from "@/types/forms";
import { DeclarationCumUndertakingForm } from "@/components/forms/DeclarationCumUndertakingForm";
import { getDeclarationById } from "@/actions/declaration-cum-undertaking.action";

// Deriving FormType directly from the keys of the imported FORM_CONFIGS object.
type FormType = keyof typeof FORM_CONFIGS;

interface EditFormPageProps {
  params: Promise<{
    formType: FormType;
    id: string;
  }>;
}

const renderForm = async (formType: FormType, id: string) => {
    switch (formType) {
        case 'agencyVisits': {
            const submission = await getAgencyVisitById(id);
            if (!submission) notFound();
            return <AgencyVisitForm initialData={submission} />;
        }
        case 'codeOfConduct': {
            const submission = await getCodeOfConductById(id);
            if (!submission) notFound();
            return <CodeOfConductForm initialData={submission} />;
        }
        case 'assetManagement': {
          const submission = await getAssetManagementById(id);
          if (!submission) notFound();
          return <AssetManagementForm initialData={submission} />;
        }
        // Added case for the new form
        case 'declarationCumUndertaking' : {
          const submission = await getDeclarationById(id);
          if(!submission) notFound();
          return <DeclarationCumUndertakingForm initialData={submission} />;
        }
        default:
            notFound();
    }
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const resolvedParams = await params;
  const { formType, id } = resolvedParams;

  if (!(formType in FORM_CONFIGS)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />
      <main className="p-8">
        <div className="container mx-auto">
          {await renderForm(formType, id)}
        </div>
      </main>
    </div>
  );
}

