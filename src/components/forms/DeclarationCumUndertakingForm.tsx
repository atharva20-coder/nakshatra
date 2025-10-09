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

interface DeclarationCumUndertakingFormProps {
  initialData?: {
    id: string;
    status: string;
    details: DeclarationCumUndertakingRow[];
  } | null;
}

const createNewRow = (id: number): DeclarationCumUndertakingRow => ({
  id,
  collectionManagerName: "",
  collectionManagerEmployeeId: "",
  collectionManagerSignature: "",
});

export const DeclarationCumUndertakingForm = ({ initialData }: DeclarationCumUndertakingFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.declarationCumUndertaking;

  const {
    approvalStatus,
    isSubmitted,
    canEdit,
    refreshApprovalStatus
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'declarationCumUndertaking',
    formStatus: initialData?.status
  });

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<DeclarationCumUndertakingRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
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

    // Confirm resubmission
    if (status === "SUBMITTED" && initialData?.id && !isSubmitted) {
      const confirmed = confirm(
        "⚠️ Important: Once you submit this form, it will be locked again.\n\n" +
        "You will need to request a new approval to make any further changes.\n\n" +
        "Do you want to proceed?"
      );
      
      if (!confirmed) {
        return;
      }
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ ...rest }) => rest);
    const result = await saveDeclarationCumUndertakingAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      
      if (status === "SUBMITTED") {
        // Refresh approval status to clear any active approvals
        refreshApprovalStatus();
        router.push("/dashboard");
      } else if (result.formId) {
        router.push(`/forms/declarationCumUndertaking/${result.formId}`);
      }
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) {
      toast.error("Form ID not found.");
      return;
    }
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
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Approval Status Alerts */}
      <ApprovalStatusAlerts
        approvalStatus={approvalStatus}
        isSubmitted={isSubmitted}
        canEdit={canEdit()}
      />

      {/* Header section */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
        <div className="flex gap-2">
          {session?.user && initialData?.id && (
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(true)}
              disabled={isPending}
            >
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          )}
          {isSubmitted && !canEdit() && (
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(true)}
              disabled={isPending || approvalStatus.hasRequest}
            >
              Request Edit Access
            </Button>
          )}
          {initialData?.id && !isSubmitted && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash className="h-4 w-4 mr-2" />
              Delete Draft
            </Button>
          )}
        </div>
      </div>

      {/* Warning for resubmission */}
      {!isSubmitted && initialData?.id && canEdit() && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-1">Important Notice</h4>
              <p className="text-sm text-amber-800">
                Your approval to edit this form is currently active. Once you submit the form, it will be locked again. 
                You will need to request a new approval to make any further changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Declaration text */}
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
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
          {canEdit() && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Manager
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
          {/* Table Header */}
          <div className="grid grid-cols-[3fr_2fr_2fr_auto] items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 font-medium text-sm border-b">
            <span>Collection Manager Name</span>
            <span>Employee ID</span>
            <span>Signature</span>
            {canEdit() && <span className="w-10"></span>}
          </div>
          
          {/* Table Rows */}
          {rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No collection managers added yet. Click &quot;Add Manager&quot; to get started.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[3fr_2fr_2fr_auto] items-center gap-4 p-3 border-b last:border-b-0">
                <Input
                  value={row.collectionManagerName}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerName", e.target.value)}
                  disabled={!canEdit() || isPending}
                  placeholder="Enter manager's full name"
                  className="bg-white dark:bg-gray-900"
                />
                <Input
                  value={row.collectionManagerEmployeeId}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerEmployeeId", e.target.value)}
                  disabled={!canEdit() || isPending}
                  placeholder="Employee ID"
                  className="bg-white dark:bg-gray-900"
                />
                <Input
                  value={row.collectionManagerSignature}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerSignature", e.target.value)}
                  disabled={!canEdit() || isPending}
                  placeholder="Signature"
                  className="bg-white dark:bg-gray-900"
                />
                {canEdit() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={!canEdit() || isPending || rows.length <= 1}
                    title={rows.length <= 1 ? "At least one manager is required" : "Remove manager"}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action buttons */}
      {canEdit() && (
        <div className="flex justify-end space-x-4 pt-4">
          <Button 
            variant="outline" 
            onClick={() => handleSaveOrSubmit("DRAFT")} 
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSaveOrSubmit("SUBMITTED")} 
            disabled={isPending}
            className="bg-rose-800 hover:bg-rose-900 text-white"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {initialData?.id && !isSubmitted ? "Resubmit Form" : "Submit for Approval"}
          </Button>
        </div>
      )}

      {/* Information banner for locked forms */}
      {isSubmitted && !canEdit() && !approvalStatus.hasRequest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Form Locked</h4>
              <p className="text-sm text-blue-800">
                This form has been submitted and is currently locked. To make changes, click &quot;Request Edit Access&quot; above.
                Once approved, you can edit and resubmit the form.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {initialData?.id && (
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