"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { FORM_CONFIGS } from "@/types/forms";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { getPenaltiesForAgencyAction } from "@/actions/audit-management.action";
import { Penalty, Observation, Audit, PenaltyStatus } from "@/generated/prisma";
import Link from "next/link";

// Define the type for the penalty data we'll fetch
type PenaltyWithRelations = Penalty & {
  observation: (Observation & {
    showCauseNoticeId: string | null; // Ensure this is here
    audit: (Audit & {
      firm: { name: string } | null;
    }) | null;
  }) | null;
};

// This component is now READ-ONLY for the agency.
export const PenaltyMatrixForm = () => {
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(true);
  const [penalties, setPenalties] = useState<PenaltyWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const metadata = FORM_CONFIGS.penaltyMatrix;

  useEffect(() => {
    if (session) {
      fetchPenalties();
    }
  }, [session]);

  const fetchPenalties = async () => {
    setIsPending(true);
    setError(null);
    try {
      const result = await getPenaltiesForAgencyAction();
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        // We cast here because the include is complex
        setPenalties(result.penalties as PenaltyWithRelations[]);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const getStatusBadge = (status: PenaltyStatus) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case "ACKNOWLEDGED":
        return <Badge className="bg-green-100 text-green-800">Acknowledged</Badge>;
      case "PAID":
        return <Badge variant="secondary">Paid</Badge>;
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">
            This is a read-only view of all penalties assigned to your agency.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Finalized Penalty Records</CardTitle>
          <CardDescription>
            All penalties finalized by the admin are listed here. You can click the Notice Ref No. to see the original Show Cause Notice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                  <TableHead>Notice Ref No</TableHead>
                  <TableHead>Audit Firm</TableHead>
                  <TableHead>Observation #</TableHead>
                  <TableHead>Penalty Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Deduction Month</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-red-600">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                      {error}
                    </TableCell>
                  </TableRow>
                ) : penalties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <FileText className="h-6 w-6 mx-auto mb-2" />
                      No penalties have been assigned.
                    </TableCell>
                  </TableRow>
                ) : (
                  penalties.map((penalty) => (
                    <TableRow key={penalty.id}>
                      <TableCell className="font-mono text-xs">
                        {penalty.noticeRefNo && penalty.observation?.showCauseNoticeId ? (
                          <Link href={`/user/show-cause/${penalty.observation.showCauseNoticeId}`} className="text-blue-600 hover:underline">
                            {penalty.noticeRefNo}
                          </Link>
                        ) : (
                          penalty.noticeRefNo || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>{penalty.observation?.audit?.firm?.name || 'N/A'}</TableCell>
                      <TableCell>{penalty.observation?.observationNumber}</TableCell>
                      <TableCell className="max-w-xs truncate" title={penalty.penaltyReason}>{penalty.penaltyReason}</TableCell>
                      <TableCell className="font-semibold">₹{penalty.penaltyAmount.toString()}</TableCell>
                      <TableCell>{penalty.deductionMonth}</TableCell>
                      <TableCell>
                        {getStatusBadge(penalty.status)}
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
  );
};