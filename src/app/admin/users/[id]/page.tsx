import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";
import { getSubmissionsForUser } from "@/actions/form-management.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReturnButton } from "@/components/return-button";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { Mail, Shield, Calendar, CheckCircle } from "lucide-react";

interface UserProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { id } = await params; // Await the params promise here
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.ADMIN) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: id }, // Use the resolved id
  });

  if (!user) {
    notFound();
  }
  
  const { submissions, error } = await getSubmissionsForUser(id); // Use the resolved id

  if (error || !submissions) {
    return <div>Error loading submissions for this user.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl px-6 py-12 space-y-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">{user.name}&apos;s Profile</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-gray-500">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>{user.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
               <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          <ReturnButton href="/admin/forms" label="Back to Forms" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions && submissions.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map((form) => (
                    <tr key={form.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {FORM_CONFIGS[form.formType as FormType]?.title || form.formType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${form.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(form.updatedAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/forms/${form.formType}/${form.id}`} className="text-rose-600 hover:text-rose-900">
                          View / Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-8">This user has no submissions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

