// src/components/forms/PaymentRegisterForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2, History, AlertCircle } from 'lucide-react'; // Added History, AlertCircle
import { PaymentRegisterRow, FORM_CONFIGS } from "@/types/forms";
import { savePaymentRegisterAction, deletePaymentRegisterAction } from '@/actions/payment-register.action';
import { ApprovalRequestDialog } from "@/components/approval-request-dialog"; // Assuming these exist
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog"; // Assuming these exist
import { useSession } from "@/lib/auth-client"; // Assuming this exists
import { useFormApproval } from "@/hooks/use-form-approval"; // Assuming this exists
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts"; // Assuming this exists
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


// ** MODIFIED INTERFACE **
interface PaymentRegisterFormProps {
  initialData?: {
    id: string;
    status: string;
    details: PaymentRegisterRow[];
    agencyInfo?: { userId: string; name: string; email: string }; // Added optional agency info
  } | null;
  isAdminView?: boolean; // Added isAdminView prop
}
// ** END MODIFIED INTERFACE **

const createNewRow = (id: number): PaymentRegisterRow => ({
  id,
  srNo: String(id),
  month: "",
  eReceiptNo: "",
  accountNo: "",
  customerName: "",
  receiptAmount: "0",
  modeOfPayment: "",
  depositionDate: new Date().toISOString().split('T')[0],
  fosHhdId: "",
  fosName: "",
  fosSign: "",
  cmName: "",
  cmVerificationStatus: "",
  remarks: "",
});

// ** MODIFIED COMPONENT SIGNATURE **
export const PaymentRegisterForm = ({ initialData, isAdminView = false }: PaymentRegisterFormProps) => { // Destructure isAdminView
// ** END MODIFIED COMPONENT SIGNATURE **
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  // const [isSubmitted, setIsSubmitted] = useState(initialData?.status === "SUBMITTED"); // Use hook's state
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.paymentRegister;

  const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit, // Rename original canEdit
    refreshApprovalStatus,
    setIsSubmitted // Function to update local state if needed
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'paymentRegister',
    formStatus: initialData?.status
  });

   // Determine actual editability
  const isFormEditable = !isAdminView && canUserRequestEdit();

  const initialRows = initialData?.details?.length
   ? initialData.details.map(d => ({ ...d, id: String(d.id) }))
   : [createNewRow(1)];

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<PaymentRegisterRow>(
   initialRows,
    createNewRow
  );

  // No longer needed, use hook's state
  // useEffect(() => {
  //   setIsSubmitted(initialData?.status === "SUBMITTED");
  // }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
     // Prevent action in admin view
     if (isAdminView) return;

    if (rows.length === 0) {
      toast.error("Please add at least one payment entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.month || !row.eReceiptNo || !row.accountNo || !row.customerName ||
             !row.receiptAmount || !row.modeOfPayment || !row.depositionDate ||
             !row.fosHhdId || !row.fosName || !row.fosSign || !row.cmName || !row.cmVerificationStatus
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
    const result = await savePaymentRegisterAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.formId ? `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!` : result.error ?? 'An unknown error occurred'); // Use message from result if available
      if (status === "SUBMITTED") {
        setIsSubmitted(true); // Update local state
        refreshApprovalStatus();
        router.push("/user/dashboard");
      } else if (result.formId && !initialData?.id) {
         // Only push if it's a new draft being saved
        router.push(`/user/forms/paymentRegister/${result.formId}`);
      }
      router.refresh(); // Ensure server state is refetched
    }
  };

  const handleDelete = async () => {
    // Prevent action in admin view or if submitted
    if (isAdminView || !isFormEditable || !initialData?.id || isSubmitted) return;

    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const result = await deletePaymentRegisterAction(initialData.id);
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
    <div className="space-y-6 max-w-[1800px] mx-auto">
       {/* Approval Status Alerts (Only show if NOT admin view) */}
       {!isAdminView && (
        <ApprovalStatusAlerts
            approvalStatus={approvalStatus}
            isSubmitted={isSubmitted}
            canEdit={isFormEditable}
        />
       )}

       {/* Show Agency Info if in Admin View */}
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

      {/* Header with conditional buttons */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
        <div className="flex gap-2">
           {/* History button always visible for existing forms */}
           {session?.user && initialData?.id && (
             <Button variant="outline" onClick={() => setShowHistoryDialog(true)} disabled={isPending}>
               <History className="h-4 w-4 mr-2" /> View History
             </Button>
           )}
           {/* Request Edit only for users on submitted forms */}
          {!isAdminView && isSubmitted && !isFormEditable && (
            <Button variant="outline" onClick={() => setShowApprovalDialog(true)} disabled={isPending || approvalStatus.hasRequest}>
              Request Edit Access
            </Button>
          )}
           {/* Delete Draft only for users on editable drafts */}
          {!isAdminView && initialData?.id && !isSubmitted && isFormEditable && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash className="h-4 w-4 mr-2" />
              Delete Draft
            </Button>
          )}
        </div>
      </div>

       {/* Resubmission Warning (only show if user is editing an approved form) */}
      {!isAdminView && !isSubmitted && initialData?.id && isFormEditable && (
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
            {/* ... Warning content ... */}
             <div className="flex items-start gap-2">
                 <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                 <div>
                     <span className="font-semibold">Editing Approved Form:</span> Resubmitting will lock the form again, requiring a new approval for future edits.
                 </div>
             </div>
         </div>
      )}

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Records</h3>
          {/* Add button only if editable */}
          {isFormEditable && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Payment
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
          <Table className="min-w-max"> {/* Use min-w-max */}
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400 tracking-wider">
                <TableHead className="px-2 py-3">Sr No*</TableHead>
                <TableHead className="px-2 py-3">Month*</TableHead>
                <TableHead className="px-2 py-3">E-Receipt No*</TableHead>
                <TableHead className="px-2 py-3">Account No*</TableHead>
                <TableHead className="px-2 py-3">Customer Name*</TableHead>
                <TableHead className="px-2 py-3">Receipt Amount*</TableHead>
                <TableHead className="px-2 py-3">Mode of Payment*</TableHead>
                <TableHead className="px-2 py-3">Deposition Date*</TableHead>
                <TableHead className="px-2 py-3">FOS HHD ID*</TableHead>
                <TableHead className="px-2 py-3">FOS Name*</TableHead>
                <TableHead className="px-2 py-3">FOS Sign*</TableHead>
                <TableHead className="px-2 py-3">CM Name*</TableHead>
                <TableHead className="px-2 py-3">CM Verification*</TableHead>
                <TableHead className="px-2 py-3">Remarks</TableHead>
                {/* Action column only if editable */}
                {isFormEditable && <TableHead className="px-2 py-3 text-center w-16">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isFormEditable ? 15 : 14} className="h-24 text-center text-muted-foreground">
                     {isFormEditable ? 'No payments added yet. Click "Add Payment" to get started.' : 'No payments recorded for this submission.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm">
                     {/* Disable inputs based on isFormEditable */}
                    <TableCell className="p-2"><Input value={row.srNo} onChange={(e) => handleInputChange(row.id, "srNo", e.target.value)} disabled={!isFormEditable || isPending} required className="w-16 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.month} onChange={(e) => handleInputChange(row.id, "month", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Month" className="w-24 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.eReceiptNo} onChange={(e) => handleInputChange(row.id, "eReceiptNo", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Receipt No" className="w-32 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.accountNo} onChange={(e) => handleInputChange(row.id, "accountNo", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Account No" className="w-36 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.customerName} onChange={(e) => handleInputChange(row.id, "customerName", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Customer" className="w-40 h-8" /></TableCell>
                    <TableCell className="p-2"><Input type="number" value={row.receiptAmount} onChange={(e) => handleInputChange(row.id, "receiptAmount", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="0.00" className="w-28 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.modeOfPayment} onChange={(e) => handleInputChange(row.id, "modeOfPayment", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Mode" className="w-28 h-8" /></TableCell>
                    <TableCell className="p-2"><Input type="date" value={row.depositionDate} onChange={(e) => handleInputChange(row.id, "depositionDate", e.target.value)} disabled={!isFormEditable || isPending} required className="w-36 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.fosHhdId} onChange={(e) => handleInputChange(row.id, "fosHhdId", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="HHD ID" className="w-28 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.fosName} onChange={(e) => handleInputChange(row.id, "fosName", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="FOS Name" className="w-32 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.fosSign} onChange={(e) => handleInputChange(row.id, "fosSign", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Signature" className="w-28 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.cmName} onChange={(e) => handleInputChange(row.id, "cmName", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="CM Name" className="w-32 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.cmVerificationStatus} onChange={(e) => handleInputChange(row.id, "cmVerificationStatus", e.target.value)} disabled={!isFormEditable || isPending} required placeholder="Status" className="w-28 h-8" /></TableCell>
                    <TableCell className="p-2"><Input value={row.remarks} onChange={(e) => handleInputChange(row.id, "remarks", e.target.value)} disabled={!isFormEditable || isPending} placeholder="Optional" className="w-40 h-8" /></TableCell>
                    {/* Action cell only if editable */}
                    {isFormEditable && (
                      <TableCell className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={!isFormEditable || isPending || rows.length <= 1}
                           className="hover:text-red-500 h-8 w-8"
                           title={rows.length <= 1 ? "At least one payment is required" : "Remove payment"}
                        >
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

      {/* Action buttons (Save/Submit) - Only show if editable */}
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

        {/* Read-only message */}
        {(isAdminView || (isSubmitted && !isFormEditable)) && (
          <div className="text-center py-4 text-muted-foreground mt-6 border-t dark:border-gray-700">
             <p className="text-sm">
                {isAdminView ? "Viewing submitted form (read-only)." : "This form is submitted and locked."}
             </p>
          </div>
        )}

      {/* Dialogs (Only show if NOT admin view) */}
      {!isAdminView && initialData?.id && (
         <>
           <ApprovalRequestDialog
              isOpen={showApprovalDialog}
              onClose={() => setShowApprovalDialog(false)}
              formType="paymentRegister"
              formId={initialData.id}
              onSuccess={() => { refreshApprovalStatus(); router.refresh(); }}
            />
            {session?.user && (
              <ApprovalHistoryDialog
                 isOpen={showHistoryDialog}
                 onClose={() => setShowHistoryDialog(false)}
                 formId={initialData.id}
                 formType="paymentRegister"
                 formTitle={metadata.title}
               />
             )}
         </>
       )}
    </div>
  );
};