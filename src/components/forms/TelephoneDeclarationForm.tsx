// src/components/forms/TelephoneDeclarationForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2, History, AlertCircle } from 'lucide-react';
import { TelephoneDeclarationRow, FORM_CONFIGS } from "@/types/forms";
import { saveTelephoneDeclarationAction, deleteTelephoneDeclarationAction } from '@/actions/telephone-declaration.action';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApprovalRequestDialog } from "@/components/approval-request-dialog";
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Correct import

// ** MODIFIED INTERFACE **
interface TelephoneDeclarationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: TelephoneDeclarationRow[];
    agencyInfo?: { userId: string; name: string; email: string };
  } | null;
  isAdminView?: boolean;
}
// ** END MODIFIED INTERFACE **

const createNewRow = (id: number): TelephoneDeclarationRow => ({
  id,
  srNo: String(id),
  telephoneNo: "",
  username: "",
  executiveCategory: "",
  recordingLine: "No",
  remarks: "",
});

// ** MODIFIED COMPONENT SIGNATURE **
export const TelephoneDeclarationForm = ({ initialData, isAdminView = false }: TelephoneDeclarationFormProps) => {
// ** END MODIFIED COMPONENT SIGNATURE **
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.telephoneDeclaration;

  const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit,
    refreshApprovalStatus,
    setIsSubmitted
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'telephoneDeclaration',
    formStatus: initialData?.status
  });

  const isFormEditable = !isAdminView && canUserRequestEdit();

  const initialRows = initialData?.details?.length
   ? initialData.details.map(d => ({ ...d, id: String(d.id) }))
   : [createNewRow(1)];

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<TelephoneDeclarationRow>(
    initialRows,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
     if (isAdminView) return;

    if (rows.length === 0) {
      toast.error("Please add at least one telephone line entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.telephoneNo || !row.username || !row.executiveCategory || !row.recordingLine
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
    const result = await saveTelephoneDeclarationAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
       toast.success(result.formId ? `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!` : result.error ?? 'An unknown error occurred');
      if (status === "SUBMITTED") {
        setIsSubmitted(true);
        refreshApprovalStatus();
        router.push("/user/dashboard");
      } else if (result.formId && !initialData?.id) {
        router.push(`/user/forms/telephoneDeclaration/${result.formId}`);
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
    const result = await deleteTelephoneDeclarationAction(initialData.id);
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
    <div className="space-y-6 max-w-7xl mx-auto">
       {!isAdminView && (
        <ApprovalStatusAlerts
            approvalStatus={approvalStatus}
            isSubmitted={isSubmitted}
            canEdit={isFormEditable}
        />
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
          Declaration of all telephone lines used for collection activities. All lines must be properly recorded and monitored as per RBI guidelines and bank policies. Fields marked with * are required.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Telephone Line Details</h3>
          {isFormEditable && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Line
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
          {/* **** CORRECTION: Ensure NO whitespace between <Table> and <TableHeader> **** */}
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400 tracking-wider">
                <TableHead className="px-3 py-3 w-20">Sr. No*</TableHead>
                <TableHead className="px-3 py-3 min-w-[160px]">Telephone No*</TableHead>
                <TableHead className="px-3 py-3 min-w-[140px]">Username*</TableHead>
                <TableHead className="px-3 py-3 min-w-[140px]">Executive Category*</TableHead>
                <TableHead className="px-3 py-3 min-w-[100px]">Recording Line*</TableHead>
                <TableHead className="px-3 py-3 min-w-[160px]">Remarks</TableHead>
                {isFormEditable && <TableHead className="px-3 py-3 text-center w-16">Action</TableHead>}
              </TableRow>
            </TableHeader>
            {/* **** CORRECTION: Ensure NO whitespace between </TableHeader> and <TableBody> **** */}
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isFormEditable ? 7 : 6} className="h-24 text-center text-muted-foreground">
                    {isFormEditable ? 'No telephone lines added yet. Click "Add Line" to get started.' : 'No telephone lines recorded for this submission.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm">
                    <TableCell className="p-3"><Input value={row.srNo} onChange={(e) => handleInputChange(row.id, "srNo", e.target.value)} disabled={!isFormEditable || isPending} required placeholder={String(index + 1)} className="w-20 h-8"/></TableCell>
                    <TableCell className="p-3"><Input value={row.telephoneNo} onChange={(e) => handleInputChange(row.id, "telephoneNo", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="+91-XXX-XXX-XXXX" className="min-w-[160px] h-8"/></TableCell>
                    <TableCell className="p-3"><Input value={row.username} onChange={(e) => handleInputChange(row.id, "username", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Username" className="min-w-[140px] h-8"/></TableCell>
                    <TableCell className="p-3"><Input value={row.executiveCategory} onChange={(e) => handleInputChange(row.id, "executiveCategory", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Category" className="min-w-[140px] h-8"/></TableCell>
                    <TableCell className="p-3">
                      <Select value={row.recordingLine} onValueChange={(value) => handleInputChange(row.id, "recordingLine", value)} disabled={!isFormEditable || isPending} required>
                        <SelectTrigger className="min-w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-3"><Input value={row.remarks} onChange={(e) => handleInputChange(row.id, "remarks", e.target.value)} disabled={!isFormEditable || isPending} placeholder="Optional remarks" className="min-w-[160px] h-8"/></TableCell>
                    {isFormEditable && (
                      <TableCell className="p-3 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={!isFormEditable || isPending || rows.length <= 1} className="hover:text-red-500 h-8 w-8" title={rows.length <= 1 ? "At least one line is required" : "Remove line"}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            {/* **** CORRECTION: Ensure NO whitespace between </TableBody> and </Table> **** */}
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
              formType="telephoneDeclaration"
              formId={initialData.id}
              onSuccess={() => { refreshApprovalStatus(); router.refresh(); }}
            />
            {session?.user && (
              <ApprovalHistoryDialog
                 isOpen={showHistoryDialog}
                 onClose={() => setShowHistoryDialog(false)}
                 formId={initialData.id}
                 formType="telephoneDeclaration"
                 formTitle={metadata.title}
               />
             )}
         </>
       )}
    </div>
  );
};