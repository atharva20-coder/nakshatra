// src/components/forms/EscalationDetailsForm.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2, History, AlertCircle } from 'lucide-react';
import { EscalationDetailsRow, FORM_CONFIGS } from "@/types/forms";
import { saveEscalationDetailsAction, deleteEscalationDetailsAction } from '@/actions/escalation-details.action';
import { Textarea } from "@/components/ui/textarea";
import { ApprovalRequestDialog } from "@/components/approval-request-dialog";
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EscalationDetailsFormProps {
  initialData?: {
    id: string;
    status: string;
    details: EscalationDetailsRow[];
    agencyInfo?: { userId: string; name: string; email: string };
  } | null;
  isAdminView?: boolean;
}

const createNewRow = (id: number): EscalationDetailsRow => ({
  id,
  customerName: "",
  loanCardNo: "",
  productBucketDpd: "",
  dateEscalation: new Date().toISOString().split('T')[0],
  escalationDetail: "",
  collectionManagerRemark: "",
  collectionManagerSign: "",
});

export const EscalationDetailsForm = ({ initialData, isAdminView = false }: EscalationDetailsFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.escalationDetails;

   const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit,
    refreshApprovalStatus,
    setIsSubmitted
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'escalationDetails',
    formStatus: initialData?.status
  });

  const isFormEditable = !isAdminView && canUserRequestEdit();

  const initialRows = initialData?.details?.length
    ? initialData.details.map(d => ({ ...d, id: String(d.id) }))
    : [createNewRow(1)];

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<EscalationDetailsRow>(
    initialRows,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
     if (isAdminView) return;

    if (rows.length === 0) {
      toast.error("Please add at least one escalation entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.customerName || !row.loanCardNo || !row.productBucketDpd ||
             !row.dateEscalation || !row.escalationDetail || !row.collectionManagerSign
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields marked with * for each entry.");
      return;
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
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveEscalationDetailsAction(rowsToSubmit, status, initialData?.id);
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
        router.push(`/user/forms/escalationDetails/${result.formId}`);
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
    const result = await deleteEscalationDetailsAction(initialData.id);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Form successfully deleted!");
      router.push("/user/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
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
              <CardTitle className="text-lg text-blue-800 dark:text-blue-300">Viewing Submission For:</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
              <p><strong>Agency:</strong> {initialData.agencyInfo.name}</p>
              <p><strong>Email:</strong> {initialData.agencyInfo.email}</p>
               <p><strong>Status:</strong> <Badge variant={initialData.status === 'SUBMITTED' ? 'default' : 'secondary'} className={initialData.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{initialData.status}</Badge></p>
            </CardContent>
         </Card>
       )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
         <div className="flex gap-2">
           {session?.user && initialData?.id && (
             <Button variant="outline" onClick={() => setShowHistoryDialog(true)} disabled={isPending}>
               <History className="h-4 w-4 mr-2" /> View History
             </Button>
           )}
          {!isAdminView && isSubmitted && !isFormEditable && (
            <Button variant="outline" onClick={() => setShowApprovalDialog(true)} disabled={isPending || approvalStatus.hasRequest}>
              Request Edit Access
            </Button>
          )}
          {!isAdminView && initialData?.id && !isSubmitted && isFormEditable && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
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
                     <span className="font-semibold">Editing Approved Form:</span> Resubmitting will lock the form again, requiring a new approval for future edits.
                 </div>
             </div>
         </div>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
        <p>
          Record of all customer complaints and escalations received by the agency. Fields marked with * are required.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Escalation Records</h3>
          {isFormEditable && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Record
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400 tracking-wider">
                <TableHead className="px-3 py-3 whitespace-nowrap">Customer Name*</TableHead>
                <TableHead className="px-3 py-3 whitespace-nowrap">Loan/Card No*</TableHead>
                <TableHead className="px-3 py-3 whitespace-nowrap">Product/Bucket/DPD*</TableHead>
                <TableHead className="px-3 py-3 whitespace-nowrap">Date of Escalation*</TableHead>
                <TableHead className="px-3 py-3 whitespace-nowrap">Escalation Detail*</TableHead>
                <TableHead className="px-3 py-3 whitespace-nowrap">CM Remark</TableHead>
                <TableHead className="px-3 py-3 whitespace-nowrap">CM Sign*</TableHead>
                {isFormEditable && <TableHead className="px-3 py-3 text-center w-16">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={isFormEditable ? 8 : 7} className="h-24 text-center text-muted-foreground">
                       {isFormEditable ? 'No records added yet. Click "Add Record" to get started.' : 'No records for this submission.'}
                   </TableCell>
                 </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm">
                    <TableCell className="p-3"><Input value={row.customerName} onChange={(e) => handleInputChange(row.id, "customerName", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Customer Name" className="min-w-[160px] h-8" /></TableCell>
                    <TableCell className="p-3"><Input value={row.loanCardNo} onChange={(e) => handleInputChange(row.id, "loanCardNo", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Loan/Card No" className="min-w-[140px] h-8" /></TableCell>
                    <TableCell className="p-3"><Input value={row.productBucketDpd} onChange={(e) => handleInputChange(row.id, "productBucketDpd", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Product/Bucket/DPD" className="min-w-[160px] h-8" /></TableCell>
                    <TableCell className="p-3"><Input type="date" value={row.dateEscalation} onChange={(e) => handleInputChange(row.id, "dateEscalation", e.target.value)} disabled={!isFormEditable || isPending} required className="min-w-[140px] h-8" /></TableCell>
                    <TableCell className="p-3">
                      <Textarea value={row.escalationDetail} onChange={(e) => handleInputChange(row.id, "escalationDetail", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Details of escalation" className="min-w-[200px] min-h-[40px] h-auto text-xs" rows={1}/>
                    </TableCell>
                    <TableCell className="p-3">
                        <Textarea value={row.collectionManagerRemark} onChange={(e) => handleInputChange(row.id, "collectionManagerRemark", e.target.value)} disabled={!isFormEditable || isPending} placeholder="Optional CM remark" className="min-w-[200px] min-h-[40px] h-auto text-xs" rows={1}/>
                    </TableCell>
                    <TableCell className="p-3"><Input value={row.collectionManagerSign} onChange={(e) => handleInputChange(row.id, "collectionManagerSign", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="CM Signature" className="min-w-[140px] h-8" /></TableCell>
                    {isFormEditable && (
                      <TableCell className="p-3 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={!isFormEditable || isPending || rows.length <= 1} className="hover:text-red-500 h-8 w-8" title={rows.length <= 1 ? "At least one record is required" : "Remove record"}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isFormEditable && (
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6 dark:border-gray-700">
          <Button variant="outline" onClick={() => handleSaveOrSubmit("DRAFT")} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSaveOrSubmit("SUBMITTED")} disabled={isPending} className="bg-rose-800 hover:bg-rose-900 text-white">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
             {initialData?.id && !isSubmitted ? "Resubmit Form" : "Submit Form"}
          </Button>
        </div>
      )}

      {(isAdminView || (isSubmitted && !isFormEditable)) && (
          <div className="text-center py-4 text-muted-foreground mt-6 border-t dark:border-gray-700">
             <p className="text-sm">
                {isAdminView ? "Viewing submitted form (read-only)." : "This form is submitted and locked."}
             </p>
          </div>
        )}

      {!isAdminView && initialData?.id && (
         <>
           <ApprovalRequestDialog
              isOpen={showApprovalDialog}
              onClose={() => setShowApprovalDialog(false)}
              formType="escalationDetails"
              formId={initialData.id}
              onSuccess={() => { refreshApprovalStatus(); router.refresh(); }}
            />
            {session?.user && (
              <ApprovalHistoryDialog
                 isOpen={showHistoryDialog}
                 onClose={() => setShowHistoryDialog(false)}
                 formId={initialData.id}
                 formType="escalationDetails"
                 formTitle={metadata.title}
               />
             )}
         </>
       )}
    </div>
  );
};