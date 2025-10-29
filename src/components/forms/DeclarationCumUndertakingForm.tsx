// src/components/forms/DeclarationCumUndertakingForm.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2, History, AlertCircle } from 'lucide-react';
import { DeclarationCumUndertakingRow, FORM_CONFIGS } from "@/types/forms";
import { saveDeclarationCumUndertakingAction, deleteDeclarationCumUndertakingAction } from '@/actions/declaration-cum-undertaking.action';
import { ApprovalRequestDialog } from "@/components/approval-request-dialog";
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Ensure Badge is imported

// Interface remains the same (includes isAdminView and agencyInfo)
interface DeclarationCumUndertakingFormProps {
  initialData?: {
    id: string;
    status: string;
    details: DeclarationCumUndertakingRow[];
    agencyInfo?: { userId: string; name: string; email: string };
  } | null;
  isAdminView?: boolean;
}


const createNewRow = (id: number): DeclarationCumUndertakingRow => ({
  id,
  collectionManagerName: "",
  collectionManagerEmployeeId: "",
  collectionManagerSignature: "",
});


export const DeclarationCumUndertakingForm = ({ initialData, isAdminView = false }: DeclarationCumUndertakingFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.declarationCumUndertaking;

  const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit,
    refreshApprovalStatus
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'declarationCumUndertaking',
    formStatus: initialData?.status
  });

  const isFormEditable = !isAdminView && canUserRequestEdit();

  const initialRows = initialData?.details?.length
    ? initialData.details.map(d => ({ ...d, id: String(d.id) }))
    : [createNewRow(1)];

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<DeclarationCumUndertakingRow>(
    initialRows,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (isAdminView) return;

    if (rows.length === 0) {
      toast.error("Please add at least one collection manager.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.collectionManagerName || !row.collectionManagerEmployeeId || !row.collectionManagerSignature
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each collection manager.");
      return;
    }

    if (status === "SUBMITTED" && initialData?.id && !isSubmitted) {
      const confirmed = confirm(
        "⚠️ Important: Once you submit this form, it will be locked again.\n\n" +
        "You will need to request a new approval to make any further changes.\n\n" +
        "Do you want to proceed?"
      );
      if (!confirmed) return;
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveDeclarationCumUndertakingAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);

      if (status === "SUBMITTED") {
        refreshApprovalStatus(); // Make sure to call this
        router.push("/user/dashboard");
      } else if (result.formId && !initialData?.id) {
        router.push(`/user/forms/declarationCumUndertaking/${result.formId}`);
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
    const result = await deleteDeclarationCumUndertakingAction(initialData.id);
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {!isAdminView && (
        <ApprovalStatusAlerts
            approvalStatus={approvalStatus}
            isSubmitted={isSubmitted}
            canEdit={isFormEditable}
        />
       )}

      {/* Agency Info Card (Corrected) */}
       {isAdminView && initialData?.agencyInfo && (
         <Card className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800 dark:text-blue-300">Viewing Submission For:</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-200 space-y-2">
              <div><strong>Agency:</strong> {initialData.agencyInfo.name}</div>
              <div><strong>Email:</strong> {initialData.agencyInfo.email}</div>
              <div className="flex items-center gap-2">
                <strong>Status:</strong>
                <Badge variant={initialData.status === 'SUBMITTED' ? 'default' : 'secondary'} className={initialData.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {initialData.status}
                </Badge>
              </div>
            </CardContent>
         </Card>
       )}

      {/* Header section */}
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
              <Trash className="h-4 w-4 mr-2" /> Delete Draft
            </Button>
          )}
        </div>
      </div>

       {/* Resubmission Warning */}
      {!isAdminView && !isSubmitted && initialData?.id && isFormEditable && (
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/30 dark:border-amber-700">
             {/* ... Warning content ... */}
              <div className="flex items-start gap-3">
                 <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                 <div className="flex-1">
                     <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Editing Approved Form</h4>
                     <p className="text-sm text-amber-800 dark:text-amber-300">
                       Resubmitting will lock the form again. You&apos;ll need another approval for future edits.
                     </p>
                 </div>
             </div>
         </div>
      )}

      {/* Declaration text */}
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
         <p>
           I/We, the undersigned, on behalf of our agency, hereby declare and undertake that all collection activities for Axis Bank will be conducted in strict adherence to the bank&apos;s code of conduct and all applicable laws and regulations.
         </p>
         <p>
           We confirm that all collection managers listed below are our employees, have been adequately trained on fair practices, and are authorized to carry out collection activities on behalf of Axis Bank. We take full responsibility for their actions and will ensure their compliance with all guidelines.
         </p>
      </div>

      {/* Collection Managers Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Authorized Collection Managers</h3>
          {isFormEditable && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Manager
            </Button>
          )}
        </div>

        {/* **** CORRECTION: Ensure NO whitespace directly inside this div **** */}
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
          {/* Table Header */}
          <div className="grid grid-cols-[3fr_2fr_2fr_auto] items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 font-medium text-sm border-b dark:border-gray-700">
            <span>Collection Manager Name*</span>
            <span>Employee ID*</span>
            <span>Signature*</span>
            {isFormEditable && <span className="w-10 text-center">Action</span>}
            {!isFormEditable && <span className="w-10"></span>} {/* Placeholder for alignment */}
          </div>
          {/* **** CORRECTION: Ensure NO whitespace between header div and the logic below **** */}
          {/* Table Rows */}
          {rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {isFormEditable ? 'No collection managers added yet. Click "Add Manager" to get started.' : 'No collection managers were added for this submission.'}
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[3fr_2fr_2fr_auto] items-center gap-4 p-3 border-b last:border-b-0 dark:border-gray-700">
                <Input
                  value={row.collectionManagerName}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerName", e.target.value)}
                  disabled={!isFormEditable || isPending}
                  placeholder="Enter manager's full name"
                  className="bg-white dark:bg-gray-900"
                  required
                />
                <Input
                  value={row.collectionManagerEmployeeId}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerEmployeeId", e.target.value)}
                  disabled={!isFormEditable || isPending}
                  placeholder="Employee ID"
                  className="bg-white dark:bg-gray-900"
                  required
                />
                <Input
                  value={row.collectionManagerSignature}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerSignature", e.target.value)}
                  disabled={!isFormEditable || isPending}
                  placeholder="Signature"
                  className="bg-white dark:bg-gray-900"
                  required
                />
                {isFormEditable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={!isFormEditable || isPending || rows.length <= 1}
                    title={rows.length <= 1 ? "At least one manager is required" : "Remove manager"}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                )}
                 {!isFormEditable && <div className="w-10"></div>} {/* Placeholder for alignment */}
              </div>
            ))
          )}
          {/* **** CORRECTION: Ensure NO whitespace before the closing div **** */}
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
            formType="declarationCumUndertaking"
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
              formType="declarationCumUndertaking"
              formTitle={metadata.title}
            />
          )}
        </>
      )}
    </div>
  );
};