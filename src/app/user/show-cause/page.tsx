// src/app/user/show-cause/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getShowCauseNoticesForAgencyAction } from "@/actions/show-cause-notice.action";
import { PageHeader } from "@/components/agency-page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShowCauseStatus } from "@/generated/prisma";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText } from "lucide-react";

const getStatusBadge = (status: ShowCauseStatus) => {
  switch (status) {
    case "ISSUED": return <Badge className="bg-yellow-100 text-yellow-800">Issued (Awaiting Response)</Badge>;
    case "RESPONDED": return <Badge className="bg-blue-100 text-blue-800">Responded (Under Review)</Badge>;
    case "CLOSED": return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
  }
};

export default async function ShowCauseListPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) redirect("/auth/login");

  const { notices, error } = await getShowCauseNoticesForAgencyAction();

  if (error) {
     return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
        <div className="container mx-auto p-8">
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader returnHref="/user/dashboard" returnLabel="Back to Dashboard" />
      <div className="container mx-auto p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Show Cause Notices</CardTitle>
            <CardDescription>All notices issued to your agency. Please respond by the due date.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observations</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Issued On</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!notices || notices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <FileText className="h-6 w-6 mx-auto mb-2" />
                        No show cause notices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    notices.map((notice) => (
                      <TableRow key={notice.id}>
                        <TableCell className="font-medium">{notice.subject}</TableCell>
                        <TableCell>{getStatusBadge(notice.status)}</TableCell>
                        <TableCell className="text-center">{notice._count.observations}</TableCell>
                        <TableCell>{new Date(notice.responseDueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(notice.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/user/show-cause/${notice.id}`}>
                              {notice.status === 'ISSUED' ? 'Respond' : 'View Details'}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}