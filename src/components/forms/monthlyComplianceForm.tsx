// src/components/forms/MonthlyComplianceForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2, History, AlertCircle, CheckCircle } from 'lucide-react';
import {
  saveMonthlyComplianceAction,
  deleteMonthlyComplianceAction,
  getActiveComplianceParametersAction,
  type ComplianceResponseInput,
} from "@/actions/monthly-compliance.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComplianceParameter, ComplianceStatus, SubmissionStatus } from "@/generated/prisma";
import { FORM_CONFIGS } from "@/types/forms";
import { ApprovalRequestDialog } from "@/components/approval-request-dialog";
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "../ui/label";
import { CMSessionIndicator } from "@/components/cm-session-indicator";
import { ApprovalButton } from "@/components/approval-button-with-session";
import { ApprovalDetailsModal } from "@/components/approval-details-modal";

type FormResponseType = {
  parameterId: string;
  srNo: number;
  parameter: string;
  category: string | null;
  complied: ComplianceStatus;
  approvals: string | null;
};

interface MonthlyComplianceFormProps {
  initialData?: {
    id: string;
    status: SubmissionStatus;
    month: number;
    year: number;
    responses: {
      id: string;
      parameterId: string;
      complied: ComplianceStatus;
      agencyRemarks: string | null;
      approvals: string | null;
    }[];
    parameters: ComplianceParameter[];
    agencyInfo?: { userId: string; name: string; email: string };
  } | null;
  isAdminView?: boolean;
}

export const MonthlyComplianceForm = ({
  initialData,
  isAdminView = false,
}: MonthlyComplianceFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.monthlyCompliance;

  const [cmSessionId, setCmSessionId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);

  const [month, setMonth] = useState(() => initialData?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(() => initialData?.year || new Date().getFullYear());
  const [responses, setResponses] = useState<FormResponseType[]>([]);
  const [allParameters, setAllParameters] = useState<ComplianceParameter[]>(
    initialData?.parameters || []
  );
  
  const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit,
    refreshApprovalStatus,
    setIsSubmitted,
  } = useFormApproval({
    formId: initialData?.id,
    formType: "monthlyCompliance",
    formStatus: initialData?.status,
  });

  const isFormEditable = !isAdminView && canUserRequestEdit();

  useEffect(() => {
    async function fetchParameters() {
      if (!initialData) {
        setIsPending(true);
        const result = await getActiveComplianceParametersAction();
        if (result.success && result.parameters) {
          setAllParameters(result.parameters);
        } else {
          toast.error(result.error || "Failed to load parameters");
        }
        setIsPending(false);
      }
    }
    fetchParameters();
  }, [initialData]);

  useEffect(() => {
    const mergedResponses = allParameters.map((param) => {
      const existingResponse = initialData?.responses.find(
        (res) => res.parameterId === param.id
      );
      return {
        parameterId: param.id,
        srNo: param.srNo,
        parameter: param.parameter,
        category: param.category,
        complied: existingResponse?.complied || ComplianceStatus.PENDING,
        approvals: existingResponse?.approvals || null,
      };
    });
    setResponses(mergedResponses);
  }, [allParameters, initialData?.responses]);
  
  const handleResponseChange = (
    parameterId: string,
    value: string
  ) => {
    setResponses((prev) =>
      prev.map((res) =>
        res.parameterId === parameterId ? { ...res, complied: value as ComplianceStatus } : res
      )
    );
  };

  const handleApprove = (
    rowId: string | number,
    approvalData: {
      signature: string;
      timestamp: string;
      collectionManager: {
        name: string;
        email: string;
        designation: string;
        productTag: string;
      };
      remarks?: string;
    }
  ) => {
    if (isAdminView) return;
    
    const parameterId = String(rowId);
    const srNo = responses.find(r => r.parameterId === parameterId)?.srNo;

    const approvalJsonString = JSON.stringify(approvalData);

    setResponses((prev) =>
      prev.map((res) =>
        res.parameterId === parameterId
          ? { ...res, approvals: approvalJsonString }
          : res
      )
    );
    toast.success(`Parameter ${srNo || ''} approved by ${approvalData.collectionManager.name}.`);
  };

  const handleViewApproval = (approvalData: string) => {
    setSelectedApproval(approvalData);
    setIsModalOpen(true);
  };

  // Helper to check if approval data is valid
  const isValidApproval = (approvalData: string | null): boolean => {
    if (!approvalData) return false;
    try {
      const parsed = JSON.parse(approvalData);
      return !!(parsed && parsed.signature && parsed.collectionManager);
    } catch {
      return false;
    }
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (isAdminView) return;

    if (status === "SUBMITTED") {
      const pendingResponses = responses.filter(
        (res) => res.complied === ComplianceStatus.PENDING
      );
      if (pendingResponses.length > 0) {
        toast.error(`Please select 'Yes', 'No', or 'NA' for all ${pendingResponses.length} pending parameters.`);
        return;
      }

      const unapprovedRows = responses.filter(res => !isValidApproval(res.approvals));
      if (unapprovedRows.length > 0) {
        toast.error(`${unapprovedRows.length} parameter(s) still need Collection Manager approval.`);
        return;
      }
    }

    if (status === "SUBMITTED" && initialData?.id && !isSubmitted) {
      const confirmed = confirm(
        "⚠️ Important: Resubmitting will lock the form.\n\n" +
          "Another approval is needed for future edits.\n\n" +
          "Proceed?"
      );
      if (!confirmed) return;
    }

    setIsPending(true);
    
    const responsesToSubmit: ComplianceResponseInput[] = responses.map(res => ({
      parameterId: res.parameterId,
      complied: res.complied,
      approvals: res.approvals
    }));
    
    const result = await saveMonthlyComplianceAction(
      { month, year, responses: responsesToSubmit },
      status,
      initialData?.id
    );
    
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        setIsSubmitted(true);
        refreshApprovalStatus();
        router.push("/user/dashboard");
      } else if (result.formId && !initialData?.id) {
        router.push(`/user/forms/monthlyCompliance/${result.formId}`);
      }
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (isAdminView || !isFormEditable || !initialData?.id || isSubmitted) return;

    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const result = await deleteMonthlyComplianceAction(initialData.id);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Form successfully deleted!");
      router.push("/user/dashboard");
      router.refresh();
    }
  };
  
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({ 
      value: i + 1, 
      label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }) 
    }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ 
      value: currentYear - i, 
      label: (currentYear - i).toString() 
    }));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {!isAdminView && isFormEditable && (
        <CMSessionIndicator onSessionChange={(sessionId) => setCmSessionId(sessionId)} />
      )}
      
      {!isAdminView && (
        <ApprovalStatusAlerts
          approvalStatus={approvalStatus}
          isSubmitted={isSubmitted}
          canEdit={isFormEditable}
        />
      )}

      {isAdminView && initialData?.agencyInfo && (
        <Card className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800 dark:text-blue-300">
              Viewing Submission For:
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <p><strong>Agency:</strong> {initialData.agencyInfo.name}</p>
            <p><strong>Email:</strong> {initialData.agencyInfo.email}</p>
            <p>
              <strong>Status:</strong>{" "}
              <Badge
                variant={initialData.status === "SUBMITTED" ? "default" : "secondary"}
                className={
                  initialData.status === "SUBMITTED"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {initialData.status}
              </Badge>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metadata.title}
          </h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
        <div className="flex gap-2">
          {session?.user && initialData?.id && (
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(true)}
              disabled={isPending}
            >
              <History className="h-4 w-4 mr-2" /> View History
            </Button>
          )}
          {!isAdminView && isSubmitted && !isFormEditable && (
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(true)}
              disabled={isPending || approvalStatus.hasRequest}
            >
              Request Edit Access
            </Button>
          )}
          {!isAdminView && initialData?.id && !isSubmitted && isFormEditable && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Draft
            </Button>
          )}
        </div>
      </div>

      {!isAdminView && !isSubmitted && initialData?.id && isFormEditable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Editing Approved Form:</span>{" "}
              Resubmitting will lock the form again, requiring a new approval
              for future edits.
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Month</Label>
            <Select 
              value={month.toString()} 
              onValueChange={(val) => setMonth(Number(val))} 
              disabled={!isFormEditable || !!initialData?.id}
            >
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Year</Label>
            <Select 
              value={year.toString()} 
              onValueChange={(val) => setYear(Number(val))} 
              disabled={!isFormEditable || !!initialData?.id}
            >
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y.value} value={y.value.toString()}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!!initialData?.id && (
            <p className="text-xs text-gray-500 md:col-span-2">
              Month and year are locked for existing forms.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead className="w-16 px-4 py-3">Sr. No</TableHead>
              <TableHead className="min-w-[200px] px-4 py-3">Category</TableHead>
              <TableHead className="min-w-[300px] px-4 py-3">Parameter</TableHead>
              <TableHead className="w-40 px-4 py-3">Complied?*</TableHead>
              <TableHead className="min-w-[300px] px-4 py-3">CM Approval*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && responses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400"/>
                </TableCell>
              </TableRow>
            ) : (
              responses.map((res) => {
                const hasValidApproval = isValidApproval(res.approvals);
                
                return (
                  <TableRow key={res.parameterId}>
                    <TableCell className="px-4 py-2 text-center font-medium">
                      {res.srNo}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-sm">
                      {res.category || 'General'}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-sm whitespace-pre-wrap">
                      {res.parameter}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Select
                        value={res.complied}
                        onValueChange={(value) =>
                          handleResponseChange(res.parameterId, value)
                        }
                        disabled={!isFormEditable || isPending}
                        required
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ComplianceStatus.PENDING}>Pending</SelectItem>
                          <SelectItem value={ComplianceStatus.YES}>Yes</SelectItem>
                          <SelectItem value={ComplianceStatus.NO}>No</SelectItem>
                          <SelectItem value={ComplianceStatus.NA}>NA</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {hasValidApproval ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full h-8 text-xs font-medium text-green-700 border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800/30"
                          onClick={() => handleViewApproval(res.approvals!)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1.5" />
                          View Approval
                        </Button>
                      ) : !isAdminView ? (
                        <ApprovalButton
                          rowId={res.parameterId}
                          formType="monthlyCompliance"
                          formId={initialData?.id || 'draft'}
                          fieldToUpdate="approvals"
                          cmSessionId={cmSessionId}
                          onApprovalSuccess={handleApprove}
                          disabled={!isFormEditable || isPending}
                          isApproved={false}
                        />
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not Approved</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {isFormEditable && (
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => handleSaveOrSubmit("DRAFT")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSaveOrSubmit("SUBMITTED")}
            disabled={isPending}
            className="bg-rose-800 hover:bg-rose-900 text-white"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {initialData?.id && !isSubmitted ? "Resubmit Form" : "Submit Form"}
          </Button>
        </div>
      )}

      {(isAdminView || (isSubmitted && !isFormEditable)) && (
        <div className="text-center py-4 text-muted-foreground mt-6 border-t dark:border-gray-700">
          <p className="text-sm">
            {isAdminView
              ? "Viewing submitted form (read-only)."
              : "This form is submitted and locked."}
          </p>
        </div>
      )}

      <ApprovalDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        approvalData={selectedApproval}
      />

      {!isAdminView && initialData?.id && (
        <>
          <ApprovalRequestDialog
            isOpen={showApprovalDialog}
            onClose={() => setShowApprovalDialog(false)}
            formType="monthlyCompliance"
            formId={initialData.id}
            onSuccess={() => {
              refreshApprovalStatus();
              router.refresh();
            }}
          />
          {session?.user && (
            <ApprovalHistoryDialog
              isOpen={showHistoryDialog}
              onClose={() => setShowHistoryDialog(false)}
              formId={initialData.id}
              formType="monthlyCompliance"
              formTitle={metadata.title}
            />
          )}
        </>
      )}
    </div>
  );
};