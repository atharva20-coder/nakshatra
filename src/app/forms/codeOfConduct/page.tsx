import { PageHeader } from "@/components/agency-page-header";
import { CodeOfConductForm } from "@/components/forms/CodeOfConductForm";

export default function NewCodeOfConductPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />
            <main className="p-8">
                <div className="container mx-auto">
                    <CodeOfConductForm />
                </div>
            </main>
        </div>
    );
}