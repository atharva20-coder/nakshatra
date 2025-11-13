// src/app/user/advisories/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/agency-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, Check } from "lucide-react";
import { getAllAdvisoriesForUserAction } from "@/actions/announcement.action";
import { Badge } from "@/components/ui/badge";

export default async function AdvisoriesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) redirect("/auth/login");

  const result = await getAllAdvisoriesForUserAction();

  if (!result.success) {
     return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
        <div className="container mx-auto p-8">
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const advisories = result.data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
      <div className="container mx-auto p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Advisory Board</CardTitle>
            <CardDescription>All advisories and announcements from the admin team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!advisories || advisories.length === 0 ? (
              <div className="h-24 text-center text-muted-foreground flex flex-col justify-center items-center">
                <FileText className="h-8 w-8 mb-2" />
                No advisories found.
              </div>
            ) : (
              advisories.map((adv) => (
                <div key={adv.id} className="border p-4 rounded-lg bg-white dark:bg-gray-800 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{adv.title}</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Posted: {new Date(adv.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {adv.content}
                      </p>
                    </div>
                    {adv.isRead && (
                      <Badge variant="secondary" className="absolute top-4 right-4">
                        <Check className="h-3 w-3 mr-1" /> Read
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}