import { notFound } from "next/navigation";
import { PageHeader } from "@/components/agency-page-header";
import { AgencyVisitForm } from "@/components/forms/AgencyVisitForm";
import { getAgencyVisitById } from "@/actions/agency-visit.action";
import { FORM_CONFIGS } from "@/types/forms";

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
        // Add cases for other forms here
        // case 'codeOfConduct': {
        //     const submission = await getCodeOfConductById(id);
        //     if (!submission) notFound();
        //     return <CodeOfConductForm initialData={submission} />;
        // }
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
      <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />
      <main className="p-8">
        <div className="container mx-auto">
          {await renderForm(formType, id)}
        </div>
      </main>
    </div>
  );
}