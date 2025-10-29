import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { SubmissionStatus } from "@/generated/prisma";

interface MonthlyFormCardProps {
  year: number;
  monthName: string;
  forms: {
    id: string;
    status: SubmissionStatus;
    updatedAt: Date;
    formType: string;
  }[];
}

export function MonthlyFormCard({ year, monthName, forms }: MonthlyFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{monthName} {year}</CardTitle>
      </CardHeader>
      <CardContent>
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
            {forms.map((form) => (
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
                  <Link href={`/admin/adminViewForms/${form.formType}/${form.id}`} className="text-rose-600 hover:text-rose-900">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}