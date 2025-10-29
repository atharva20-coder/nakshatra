// src/components/forms/AssetManagementForm.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, History, AlertCircle, Save, Send, Loader2 } from "lucide-react";
import { saveAssetManagementAction, deleteAssetManagementAction } from "@/actions/asset-management.action";
import { cn } from "@/lib/utils";
import { AssetManagementRow, FORM_CONFIGS } from "@/types/forms";
import { ApprovalRequestDialog } from "@/components/approval-request-dialog";
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Badge } from "@/components/ui/badge"; // Import Badge

// ** MODIFIED INTERFACE **
interface AssetManagementFormProps {
  initialData?: {
    id: string;
    status: string;
    details: AssetManagementRow[];
    agencyInfo?: { userId: string; name: string; email: string }; // Added optional agency info
  } | null;
  isAdminView?: boolean; // Added isAdminView prop
}
// ** END MODIFIED INTERFACE **

const createNewRow = (id: number): AssetManagementRow => ({
  id,
  srNo: String(id),
  systemCpuSerialNo: "",
  ipAddress: "",
  executiveName: "",
  idCardNumber: "",
  printerAccess: "",
  assetDisposed: "",
});

// ** MODIFIED COMPONENT SIGNATURE **
export const AssetManagementForm = ({ initialData, isAdminView = false }: AssetManagementFormProps) => { // Destructure isAdminView
// ** END MODIFIED COMPONENT SIGNATURE **
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.assetManagement;

  const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit, // Rename original canEdit
    refreshApprovalStatus,
    setIsSubmitted
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'assetManagement',
    formStatus: initialData?.status
  });

  // Determine actual editability based on role and approval status
  const isFormEditable = !isAdminView && canUserRequestEdit();

 const initialRows = initialData?.details?.length
   ? initialData.details.map(d => ({ ...d, id: String(d.id) }))
   : [createNewRow(1)];

 const { rows, addRow, removeRow, handleInputChange } = useTableRows<AssetManagementRow>(
   initialRows,
   createNewRow
 );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
     // Prevent action in admin view
     if (isAdminView) return;

     if (rows.length === 0) {
        toast.error("Please add at least one asset entry.");
        return;
      }
      const hasEmptyRequiredFields = rows.some(
        row => !row.srNo?.trim() ||
               !row.systemCpuSerialNo?.trim() ||
               !row.ipAddress?.trim() ||
               !row.executiveName?.trim() ||
               !row.idCardNumber?.trim() ||
               !row.printerAccess?.trim() ||
               !row.assetDisposed?.trim()
      );
      if (hasEmptyRequiredFields) {
         toast.error("Please fill in all required fields marked with * for each asset entry.");
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
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest); // Exclude temporary ID
    const result = await saveAssetManagementAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        setIsSubmitted(true); // Update local state
        refreshApprovalStatus();
        router.push("/user/dashboard");
      } else if (result.formId && !initialData?.id) {
         // Only push if it's a new draft being saved
         router.push(`/user/forms/assetManagement/${result.formId}`);
      }
      router.refresh(); // Ensure server state is refetched
    }
  };

  const handleDelete = async () => {
       // Prevent action in admin view or if submitted
       if (isAdminView || !isFormEditable || !initialData?.id || isSubmitted) return;
       if (!confirm("Are you sure you want to delete this draft? This cannot be undone.")) return;

       setIsDeleting(true);
       try {
         const result = await deleteAssetManagementAction(initialData.id);
         if(result.error) {
           toast.error(result.error);
         } else {
           toast.success("Draft deleted successfully");
           router.push('/user/dashboard');
           router.refresh();
         }
       } catch (error) {
          console.error("Error deleting form:", error);
          toast.error("An unexpected error occurred.");
       } finally {
         setIsDeleting(false);
       }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
       <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
                <h2 className="text-2xl font-bold">{metadata.title}</h2>
                <p className="text-muted-foreground mt-1">{metadata.description}</p>
            </div>
             <div className="flex gap-2 flex-wrap">
                 {/* History button always visible for existing forms */}
                {session?.user && initialData?.id && (
                 <Button variant="outline" size="sm" onClick={() => setShowHistoryDialog(true)} disabled={isPending || isDeleting}>
                   <History className="h-4 w-4 mr-2" /> History
                 </Button>
                )}
                 {/* Request Edit only for users on submitted forms */}
                {!isAdminView && isSubmitted && !isFormEditable && (
                 <Button variant="outline" size="sm" onClick={() => setShowApprovalDialog(true)} disabled={isPending || approvalStatus.hasRequest}>
                   Request Edit
                 </Button>
                )}
                 {/* Delete Draft only for users on editable drafts */}
                {!isAdminView && initialData?.id && !isSubmitted && isFormEditable && (
                 <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting || isPending}>
                   <Trash2 className="h-4 w-4 mr-2" /> Delete Draft
                 </Button>
                )}
             </div>
       </div>

        {/* Resubmission Warning (only show if user is editing an approved form) */}
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

       {/* Asset Details Table */}
       <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold">Asset Details</h3>
             {/* Add Asset button only if editable */}
             {isFormEditable && (
                 <Button onClick={addRow} disabled={isPending || isDeleting} variant="outline" size="sm">
                     + Add Asset
                 </Button>
             )}
          </div>
          <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
             <Table className="min-w-max">
                 <TableHeader>
                     <TableRow className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400 tracking-wider">
                         <TableHead className="w-16 px-4 py-3">Sr No*</TableHead>
                         <TableHead className="min-w-[180px] px-4 py-3">System/CPU Serial No*</TableHead>
                         <TableHead className="min-w-[150px] px-4 py-3">IP Address*</TableHead>
                         <TableHead className="min-w-[180px] px-4 py-3">Executive Name*</TableHead>
                         <TableHead className="min-w-[140px] px-4 py-3">ID Card No*</TableHead>
                         <TableHead className="min-w-[180px] px-4 py-3">Printer Access (Yes/No + Reason)*</TableHead>
                         <TableHead className="min-w-[180px] px-4 py-3">Asset Disposed Info*</TableHead>
                          {/* Actions column only if editable */}
                         {isFormEditable && <TableHead className="w-[80px] px-4 py-3 text-center">Actions</TableHead>}
                     </TableRow>
                 </TableHeader>
                 <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {rows.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={isFormEditable ? 8 : 7} className="h-24 text-center text-muted-foreground">
                                {isFormEditable ? 'No assets added yet. Click "+ Add Asset" to begin.' : 'No assets recorded for this submission.'}
                            </TableCell>
                         </TableRow>
                        ) : (
                          rows.map((row) => (
                             <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                 {/* Disable inputs based on isFormEditable */}
                                 <TableCell className="px-4 py-2"><Input value={row.srNo} onChange={(e) => handleInputChange(row.id, "srNo", e.target.value)} disabled={!isFormEditable || isPending} required className="text-sm h-8"/></TableCell>
                                 <TableCell className="px-4 py-2"><Input value={row.systemCpuSerialNo} onChange={(e) => handleInputChange(row.id, "systemCpuSerialNo", e.target.value)} disabled={!isFormEditable || isPending} required className="text-sm h-8" placeholder="Serial Number"/></TableCell>
                                 <TableCell className="px-4 py-2"><Input value={row.ipAddress} onChange={(e) => handleInputChange(row.id, "ipAddress", e.target.value)} disabled={!isFormEditable || isPending} required className="text-sm h-8" placeholder="e.g., 192.168.1.100"/></TableCell>
                                 <TableCell className="px-4 py-2"><Input value={row.executiveName} onChange={(e) => handleInputChange(row.id, "executiveName", e.target.value)} disabled={!isFormEditable || isPending} required className="text-sm h-8" placeholder="Full Name"/></TableCell>
                                 <TableCell className="px-4 py-2"><Input value={row.idCardNumber} onChange={(e) => handleInputChange(row.id, "idCardNumber", e.target.value)} disabled={!isFormEditable || isPending} required className="text-sm h-8" placeholder="ID Card Number"/></TableCell>
                                 <TableCell className="px-4 py-2"><Input value={row.printerAccess} onChange={(e) => handleInputChange(row.id, "printerAccess", e.target.value)} disabled={!isFormEditable || isPending} placeholder="Yes/No + Reason" required className="text-sm h-8" /></TableCell>
                                 <TableCell className="px-4 py-2"><Input value={row.assetDisposed} onChange={(e) => handleInputChange(row.id, "assetDisposed", e.target.value)} disabled={!isFormEditable || isPending} placeholder="e.g., Data Purged YYYY-MM-DD" required className="text-sm h-8" /></TableCell>
                                 {/* Action cell only if editable */}
                                 {isFormEditable && (
                                     <TableCell className="px-4 py-2 text-center">
                                         <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={!isFormEditable || isPending || rows.length <= 1} className="hover:text-red-500 h-8 w-8" title={rows.length <= 1 ? "At least one asset is required" : "Remove asset"}>
                                             <Trash2 className="h-4 w-4" />
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
              <Button variant="outline" onClick={() => handleSaveOrSubmit("DRAFT")} disabled={isPending || isDeleting}>
                 {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Draft
             </Button>
             <Button onClick={() => handleSaveOrSubmit("SUBMITTED")} disabled={isPending || isDeleting} className="bg-rose-800 hover:bg-rose-900 text-white">
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
              formType="assetManagement"
              formId={initialData.id}
              onSuccess={() => { refreshApprovalStatus(); router.refresh(); }}
            />
            {session?.user && (
              <ApprovalHistoryDialog
                 isOpen={showHistoryDialog}
                 onClose={() => setShowHistoryDialog(false)}
                 formId={initialData.id}
                 formType="assetManagement"
                 formTitle={metadata.title}
               />
             )}
         </>
       )}
    </div>
  );
};