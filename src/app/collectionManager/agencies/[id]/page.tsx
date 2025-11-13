"use client";

import React, { useState, useEffect, useCallback } from "react";
import { redirect, useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/generated/prisma";
import {
  getCMAgencyApprovalsAction,
  CMAgencyApproval,
} from "@/actions/collection-manager.action";
import { ReturnButton } from "@/components/return-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { CMAgencyApprovalModal } from "@/components/cm-approval-modal";
import { FormType } from "@/types/forms";

export default function CMAgencyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agencyId = params.id as string;

  const { data: session, isPending: isSessionPending } = useSession();

  // State
  const [agency, setAgency] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [approvals, setApprovals] = useState<CMAgencyApproval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<{
    id: string;
    type: string;
  } | null>(null);

  // ✅ FIXED: Removed extra brace
  const fetchData = useCallback(async () => {
    if (!agencyId) return;

    setIsLoading(true);
    const { agency, approvals, error } = await getCMAgencyApprovalsAction(
      agencyId
    );

    if (error || !agency) {
      setError(error || "Could not load agency details.");
    } else {
      setAgency(agency);
      setApprovals(approvals || []);
    }

    setIsLoading(false);
  }, [agencyId]);

  useEffect(() => {
    if (isSessionPending) return;

    if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
      redirect("/profile");
      return;
    }

    fetchData();
  }, [agencyId, session, isSessionPending, router, fetchData]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewClick = (formId: string, formType: string) => {
    setSelectedForm({ id: formId, type: formType });
    setIsModalOpen(true);
  };

  if (isSessionPending || isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-rose-900 mx-auto mb-3" />
          <div className="text-gray-600">Loading Agency Details...</div>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="container mx-auto p-8">
        <ReturnButton href="/collectionManager/dashboard" label="Back to Dashboard" />
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error || "Could not load agency details."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{agency.name}</h1>
            <p className="text-gray-600 mt-1">
              Approval history for <strong>{agency.email}</strong>
            </p>
          </div>
          <ReturnButton href="/collectionManager/dashboard" label="Back to Dashboard" />
        </div>

        {/* Approval History */}
        <Card>
          <CardHeader>
            <CardTitle>Approval History</CardTitle>
            <p className="text-sm text-gray-500">
              A log of all forms for this agency that you have approved.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Date (Last Approval)</TableHead>
                    <TableHead>View Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals && approvals.length > 0 ? (
                    approvals.map((approval) => (
                      <TableRow key={approval.formId + approval.formType}>
                        <TableCell className="font-medium">
                          {approval.formTitle}
                        </TableCell>
                        <TableCell>{formatDate(approval.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleViewClick(approval.formId, approval.formType)
                            }
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                        <FileText className="h-6 w-6 mx-auto mb-2" />
                        You have not approved any forms for this agency yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedForm && agency && (
        <CMAgencyApprovalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          formId={selectedForm.id}
          formType={selectedForm.type as FormType}
          agencyName={agency.name}
        />
      )}
    </>
  );
}
