import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFormSubmissionsAction } from "@/actions/form-management.action";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { PageHeader } from "@/components/agency-page-header";
import { UserRole } from "@/generated/prisma";

export default async function DashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/auth/login");
  }

  const { submissions, error } = await getFormSubmissionsAction();

  if (error || !submissions) {
    return <div>Error loading submissions. Please try again.</div>;
  }

  const isAgencyUser = session.user.role === UserRole.USER || session.user.role === UserRole.COLLECTION_MANAGER;

  return (
    <div>
      {isAgencyUser && (
        <PageHeader returnHref="/profile" returnLabel="Back to Profile" />
      )}
      <div className="container mx-auto max-w-5xl px-6 py-12 space-y-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">My Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and manage your form submissions.
            </p>
          </div>
          <Button asChild>
            {/* This link now correctly points to the agency visits form creation page */}
            <Link href="/forms/agencyVisits">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Agency Visit
            </Link>
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissions.map((form) => (
                <tr key={form.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{form.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {/* Use the title from FORM_CONFIGS for a user-friendly name */}
                    {FORM_CONFIGS[form.formType as FormType]?.title || form.formType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${form.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {form.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(form.updatedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* This link is now fully dynamic based on the formType */}
                    <Link href={`/forms/${form.formType}/${form.id}`} className="text-rose-600 hover:text-rose-900">
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {submissions.length === 0 && (
            <p className="text-center text-gray-500 py-8">You have no submissions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
