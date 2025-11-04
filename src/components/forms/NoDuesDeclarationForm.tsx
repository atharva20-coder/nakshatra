// src/components/forms/NoDuesDeclarationForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2, History, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import {
  saveNoDuesDeclarationAction,
  deleteNoDuesDeclarationAction,
  saveNoDuesApprovalAction, // <-- IMPORT NEW ACTION
  type NoDuesDetailInput,
} from "@/actions/no-dues-declaration.action";
import { CMApproval, NoDuesDetail, SubmissionStatus } from "@/generated/prisma";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CMSessionIndicator } from "@/components/cm-session-indicator";
import { ApprovalButton } from "@/components/approval-button-with-session";
import { Input } from "../ui/input";
import { ApprovalDetailsModal } from "@/components/approval-details-modal";
import { getErrorMessage } from "@/lib/utils";
import { useTableRows } from "@/hooks/use-table-rows";

// --- Type for the merged row data used by the form ---
type FormRowType = {
  id: string; // This is the NoDuesDetail.id
  productBucket: string;
  month: string;
  remarksBillAmount: string;
  approval: CMApproval | null; // Merged approval data
};

// --- Type for the initialData prop ---
interface NoDuesDeclarationFormProps {
  initialData?: {
    id: string;
    status: SubmissionStatus;
    month: number;
    year: number;
    details: NoDuesDetail[];
    approvals: CMApproval[];
    agencyInfo?: { userId: string; name: string; email: string };
  } | null;
  isAdminView?: boolean;
}

// --- Helper to merge details and approvals ---
const mergeData = (details: NoDuesDetail[], approvals: CMApproval[]): FormRowType[] => {
  const approvalMap = new Map(approvals.map(a => [a.rowId, a]));
  return details.map(detail => ({
    id: detail.id,
    productBucket: detail.productBucket || "",
    month: detail.month || "",
    remarksBillAmount: detail.remarksBillAmount || "",
    approval: approvalMap.get(detail.id) || null,
  }));
};

// --- Factory for new rows ---
const createNewRow = (): FormRowType => ({
  id: `new-${Date.now()}`,
  productBucket: "",
  month: "",
  remarksBillAmount: "No Dues",
  approval: null,
});

export const NoDuesDeclarationForm = ({
  initialData,
  isAdminView = false,
}: NoDuesDeclarationFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.noDuesDeclaration;

  const [cmSessionId, setCmSessionId] = useState<string | null>(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | number | null>(null);

  // --- State for form data ---
  const [month, setMonth] = useState(() => initialData?.month || new Date().getMonth() + 1);
  const [year, setYear] = useState(() => initialData?.year || new Date().getFullYear());
  
  // --- FIX: Correctly call useTableRows ---
  const {
    rows,
    setRows,
    addRow,
    removeRow,
    handleInputChange, // Use this for updates
  } = useTableRows<FormRowType>([], createNewRow); // Pass the factory function

  const {
    approvalStatus,
    isSubmitted,
    canEdit: canUserRequestEdit,
    refreshApprovalStatus,
    setIsSubmitted,
  } = useFormApproval({
    formId: initialData?.id,
    formType: "noDuesDeclaration",
    formStatus: initialData?.status,
  });

  const isFormEditable = !isAdminView && canUserRequestEdit();

  // --- Load initial data into rows state ---
  useEffect(() => {
    if (initialData?.details) {
      setRows(mergeData(initialData.details, initialData.approvals || []));
    }
  }, [initialData, setRows]);
  
  // --- FIX: Implement handleApprove ---
  const handleApprove = async (
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
    
    const detailId = String(rowId);

    // 1. Check if form is saved
    if (!initialData?.id) {
      toast.error("Please save the form as a draft before approving items.");
      return;
    }
    
    setSavingRowId(detailId);
    
    try {
      // 2. Call the new server action to save immediately
      const result = await saveNoDuesApprovalAction(
        initialData.id,
        detailId,
        approvalData // Pass the full object
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Item approved by ${approvalData.collectionManager.name}.`);
        
        // 3. Refresh the page data
        router.refresh(); 
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingRowId(null); // Clear loading state
    }
  };

  // --- Handler to view approval details ---
  const handleViewApproval = (approvalData: CMApproval) => {
    // We already have the full CMApproval object, just stringify it
    setSelectedApproval(JSON.stringify(approvalData));
    setIsModalOpen(true);
  };

  // --- Handler for Save/Submit ---
  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (isAdminView) return;

    if (status === "SUBMITTED") {
      if (rows.some(row => !row.productBucket || !row.month)) {
        toast.error("Please fill in all Product/Bucket and Month fields.");
        return;
      }
      const unapprovedRows = rows.filter(row => !row.approval);
      if (unapprovedRows.length > 0) {
        toast.error(`${unapprovedRows.length} item(s) must be approved by a CM before submitting.`);
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
    
    // Map local state to the expected action input
    const detailsToSubmit: NoDuesDetailInput[] = rows.map(row => ({
      id: row.id.startsWith("new-") ? undefined : row.id, // Only send ID if it's not new
      productBucket: row.productBucket,
      month: row.month,
      remarksBillAmount: row.remarksBillAmount,
    }));
    
    const result = await saveNoDuesDeclarationAction(
      { month, year, details: detailsToSubmit },
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
        // After first save, redirect to the edit page with the new ID
        router.push(`/user/forms/noDuesDeclaration/${result.formId}`);
      }
      router.refresh();
    }
  };
  
  // --- Handler for deleting the draft ---
  const handleDelete = async () => {
    if (isAdminView || !isFormEditable || !initialData?.id || isSubmitted) return;

    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const result = await deleteNoDuesDeclarationAction(initialData.id);
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
    return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }) }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));
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
            <p>
              <strong>Agency:</strong> {initialData.agencyInfo.name}
            </p>
            <p>
              <strong>Email:</strong> {initialData.agencyInfo.email}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <Badge
                variant={
                  initialData.status === "SUBMITTED" ? "default" : "secondary"
                }
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

      {/* Month/Year Selectors */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <Label className="text-sm font-medium">Month</Label>
              <Select value={month.toString()} onValueChange={(val) => setMonth(Number(val))} disabled={!isFormEditable || !!initialData?.id}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
            <div>
              <Label className="text-sm font-medium">Year</Label>
              <Select value={year.toString()} onValueChange={(val) => setYear(Number(val))} disabled={!isFormEditable || !!initialData?.id}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y.value} value={y.value.toString()}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!!initialData?.id && (
                <p className="text-xs text-gray-500 md:col-span-2">Month and year are locked for existing forms.</p>
            )}
        </CardContent>
      </Card>


      {/* Declaration Details Table */}
      <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead className="min-w-[200px] px-4 py-3">Product / Bucket*</TableHead>
              <TableHead className="min-w-[200px] px-4 py-3">Month of Declaration*</TableHead>
              <TableHead className="min-w-[300px] px-4 py-3">Remarks / Bill Amount</TableHead>
              <TableHead className="min-w-[250px] px-4 py-3">CM Approval*</TableHead>
              {isFormEditable && <TableHead className="w-16 px-4 py-3 text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && rows.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={isFormEditable ? 5 : 4} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400"/>
                    </TableCell>
                </TableRow>
            ) : rows.map((row) => {
              const isApproved = !!row.approval;
              const isRowSaving = savingRowId === row.id;
              
              return (
                <TableRow key={row.id}>
                  <TableCell className="px-4 py-2">
                    <Input
                      value={row.productBucket}
                      onChange={(e) => handleInputChange(row.id, "productBucket", e.target.value)}
                      disabled={!isFormEditable || isPending || isRowSaving}
                      placeholder="e.g., Credit Card / X-Bucket"
                      className="text-sm h-8"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    <Input
                      value={row.month}
                      onChange={(e) => handleInputChange(row.id, "month", e.target.value)}
                      disabled={!isFormEditable || isPending || isRowSaving}
                      placeholder="e.g., Nov-2025"
                      className="text-sm h-8"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    <Input
                      value={row.remarksBillAmount}
                      onChange={(e) => handleInputChange(row.id, "remarksBillAmount", e.target.value)}
                      disabled={!isFormEditable || isPending || isRowSaving}
                      placeholder="e.g., No Dues"
                      className="text-sm h-8"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    {(() => {
                      if (isApproved) {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full h-8 text-xs font-medium text-green-700 border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800/30"
                            onClick={() => handleViewApproval(row.approval!)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1.5" />
                            View Approval
                          </Button>
                        );
                      }
                      if (isAdminView) {
                        return <span className="text-xs text-gray-400 italic">Not Approved</span>;
                      }
                      return (
                        <ApprovalButton
                          rowId={row.id}
                          formType="noDuesDeclaration"
                          formId={initialData?.id || 'draft'}
                          fieldToUpdate="noDuesRowApproval" // This identifies the action
                          cmSessionId={cmSessionId}
                          onApprovalSuccess={handleApprove}
                          disabled={!isFormEditable || isPending || isRowSaving || row.id.startsWith("new-")}
                          isApproved={false}
                          approvalSignature={undefined}
                        />
                      );
                    })()}
                    {row.id.startsWith("new-") && !isAdminView && (
                        <p className="text-xs text-muted-foreground mt-1">Save as draft to approve.</p>
                    )}
                  </TableCell>
                  {isFormEditable && (
                    <TableCell className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)} // <-- FIX: Use row.id
                        disabled={!isFormEditable || isPending || isRowSaving || rows.length <= 1}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {isFormEditable && (
        <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={!isFormEditable || isPending}
            className="mt-4"
        >
            <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      )}

      {isFormEditable && (
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => handleSaveOrSubmit("DRAFT")}
            disabled={isPending || !!savingRowId}
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
            disabled={isPending || !!savingRowId}
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

      {/* Render the modal for approval details */}
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
            formType="noDuesDeclaration"
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
              formType="noDuesDeclaration"
              formTitle={metadata.title}
            />
          )}
        </>
      )}
    </div>
  );
};