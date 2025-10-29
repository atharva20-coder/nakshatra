// src/components/forms/AgencyVisitForm.tsx
"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Save, Send, Loader2, AlertCircle } from "lucide-react"; // Added AlertCircle
import { saveAgencyVisitAction, deleteAgencyVisitAction } from "@/actions/agency-visit.action";
import { cn } from "@/lib/utils";
import { AgencyTableRow, FORM_CONFIGS } from "@/types/forms";
import { ApprovalButton } from "@/components/approval-button-with-session";
import { CMSessionIndicator } from "@/components/cm-session-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Badge } from "@/components/ui/badge"; // Import Badge

// ** MODIFIED INTERFACE **
interface AgencyVisitFormProps {
  initialData?: {
    id: string;
    status: string;
    details: AgencyTableRow[];
    agencyInfo?: { userId: string; name: string; email: string }; // Added optional agency info
  } | null;
  isAdminView?: boolean;  // Added isAdminView prop
}
// ** END MODIFIED INTERFACE **


const createNewRow = (id: number): AgencyTableRow => {
  const now = new Date();
  return {
    id,
    srNo: String(id),
    dateOfVisit: now.toISOString().split('T')[0],
    employeeId: "",
    employeeName: "",
    mobileNo: "",
    branchLocation: "",
    product: "",
    bucketDpd: "",
    timeIn: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    timeOut: "",
    signature: "",
    purposeOfVisit: "",
  };
};

// ** MODIFIED COMPONENT SIGNATURE **
export const AgencyVisitForm = ({ initialData, isAdminView = false }: AgencyVisitFormProps) => { // Destructure isAdminView
// ** END MODIFIED COMPONENT SIGNATURE **

  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(initialData?.status === 'SUBMITTED');
  const [cmSessionId, setCmSessionId] = useState<string | null>(null);
  const metadata = FORM_CONFIGS.agencyVisits;

  // Determine actual editability
  const isFormEditable = !isAdminView && !isSubmitted;

  const { rows, addRow, removeRow, handleInputChange, updateRowValue } = useTableRows<AgencyTableRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );

  useEffect(() => {
    setIsSubmitted(initialData?.status === 'SUBMITTED');
  }, [initialData]);

  const handleApprove = (rowId: number | string, approvalData: {
    signature: string;
    timestamp: string;
    collectionManager: {
      name: string;
      email: string;
      designation: string;
      productTag: string;
    };
  }) => {
    // This logic should only run in user view
    if (isAdminView) return;

    const now = new Date();
    const signatureText = `${approvalData.collectionManager.name} (${approvalData.collectionManager.email})`;
    updateRowValue(rowId, 'signature', signatureText);

    const currentRow = rows.find(r => r.id === rowId);
    if (currentRow && !currentRow.timeOut) {
      updateRowValue(rowId, 'timeOut', now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    // Prevent action in admin view
    if (isAdminView) return;

    if (rows.length === 0) {
      toast.error("Please add at least one visit record.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.employeeId || !row.employeeName || !row.dateOfVisit || !row.branchLocation
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields (Employee ID, Name, Date, Location).");
      return;
    }

    if (status === "SUBMITTED") {
      const unapprovedRows = rows.filter(row => !row.signature);
      if (unapprovedRows.length > 0) {
        toast.error(`${unapprovedRows.length} visit(s) still need Collection Manager approval before submission.`);
        return;
      }
    }

    setIsPending(true);
    const rowsToSubmit = rows.map((row) => {
      const { id: _, ...rowWithoutId } = row;
      return rowWithoutId;
    });
    const result = await saveAgencyVisitAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        setIsSubmitted(true);
        router.push("/user/dashboard");
      } else if (result.formId) {
        // Only push if it's a new draft being saved
        if (!initialData?.id) {
            router.push(`/user/forms/agencyVisits/${result.formId}`);
        }
      }
      router.refresh();
    }
  };

  const handleDelete = async () => {
    // Prevent action in admin view or if submitted
    if (isAdminView || isSubmitted || !initialData?.id) return;

    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const result = await deleteAgencyVisitAction(initialData.id);
    setIsPending(false);
    if(result.error) {
      toast.error(result.error);
    } else {
      toast.success("Draft deleted successfully");
      router.push('/user/dashboard');
      router.refresh();
    }
  };

  const getVisitStats = () => {
    const total = rows.length;
    const approved = rows.filter(r => r.signature && r.signature !== '').length;
    const pending = rows.filter(r => !r.signature || r.signature === '').length;
    const completed = rows.filter(r => r.timeOut && r.timeOut !== '').length;

    return { total, approved, pending, completed };
  };
  const stats = getVisitStats();

  return (
    <div className="space-y-6">
      {/* Conditionally render CM Session Indicator only if NOT admin view and form is editable */}
      {!isAdminView && isFormEditable && (
        <CMSessionIndicator onSessionChange={(sessionId) => setCmSessionId(sessionId)} />
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

       {/* Status Banner (Only for User view when submitted) */}
       {!isAdminView && isSubmitted && (
         <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-center font-medium dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200">
           <p>This form has been submitted and cannot be edited.</p>
         </div>
       )}

      {/* Header - Conditionally show Delete button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{metadata.title}</h2>
          <p className="text-muted-foreground">{metadata.description}</p>
        </div>
        {isFormEditable && initialData?.id && ( // Only show delete for editable drafts
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Draft
          </Button>
        )}
      </div>

      {/* Visit Overview Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border dark:bg-gray-800 dark:border-gray-700">
          {/* Stats content remains the same */}
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Visits</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-sm text-green-700 dark:text-green-400">Approved</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">Pending Approval</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                <div className="text-sm text-blue-700 dark:text-blue-400">Completed</div>
            </div>
        </div>
      )}

      {/* Important Note (Only for editable user view) */}
      {isFormEditable && !cmSessionId && stats.pending > 0 && (
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/30 dark:border-amber-700">
            {/* Note content remains the same */}
             <div className="flex items-start gap-3">
                 <div className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</div>
                 <div>
                 <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Collection Manager Login Required</h4>
                 <p className="text-sm text-amber-800 dark:text-amber-300">
                     A Collection Manager must login using the &ldquo;CM Login&rdquo; button (top right) to approve visit records.
                     The CM will authenticate with their credentials and can then approve multiple records during their session.
                 </p>
                 </div>
             </div>
         </div>
      )}

      {/* CM Session Active Notice (Only for editable user view) */}
      {isFormEditable && cmSessionId && (
         <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/30 dark:border-green-700">
            {/* Notice content remains the same */}
              <div className="flex items-start gap-3">
                 <div className="text-green-600 dark:text-green-400 mt-0.5">✓</div>
                 <div>
                 <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">Collection Manager Active</h4>
                 <p className="text-sm text-green-800 dark:text-green-300">
                     A Collection Manager is logged in and can now approve records. Click &ldquo;Approve&rdquo; buttons below to process approvals.
                 </p>
                 </div>
             </div>
         </div>
      )}

      {/* Agency Visits Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visit Records</h3>
          {/* Add Visit button only if editable */}
          {isFormEditable && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Visit
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                 {/* Table headers remain the same, conditionally hide Actions header */}
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Sr. No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Bucket/DPD</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Time In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Time Out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">CM Approval</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Purpose</th>
                  {isFormEditable && ( // Only show Actions header if editable
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {rows.map((row, index) => (
                  <tr key={row.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-800/50", index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50")}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.srNo}</td>
                    {/* Disable all inputs based on isFormEditable */}
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={row.dateOfVisit}
                        onChange={(e) => handleInputChange(row.id, 'dateOfVisit', e.target.value)}
                        className="w-full min-w-[140px]"
                        disabled={!isFormEditable || isPending}
                      />
                    </td>
                     <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.employeeId}
                        onChange={(e) => handleInputChange(row.id, 'employeeId', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Employee ID"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.employeeName}
                        onChange={(e) => handleInputChange(row.id, 'employeeName', e.target.value)}
                        className="w-full min-w-[150px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.mobileNo}
                        onChange={(e) => handleInputChange(row.id, 'mobileNo', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Mobile"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.branchLocation}
                        onChange={(e) => handleInputChange(row.id, 'branchLocation', e.target.value)}
                        className="w-full min-w-[150px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Branch"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.product}
                        onChange={(e) => handleInputChange(row.id, 'product', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Product"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.bucketDpd}
                        onChange={(e) => handleInputChange(row.id, 'bucketDpd', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Bucket"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={row.timeIn}
                        onChange={(e) => handleInputChange(row.id, 'timeIn', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={!isFormEditable || isPending}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={row.timeOut}
                        onChange={(e) => handleInputChange(row.id, 'timeOut', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={!isFormEditable || isPending}
                      />
                    </td>
                    <td className="px-4 py-3">
                       {/* Conditionally render Approval Button or Signature Text */}
                       {!isAdminView ? (
                         <ApprovalButton
                           rowId={row.id}
                           formType="agencyVisits"
                           formId={initialData?.id || 'draft'}
                           fieldToUpdate="signature"
                           cmSessionId={cmSessionId}
                           onApprovalSuccess={handleApprove}
                           disabled={!isFormEditable || isPending} // Disable if form not editable
                           isApproved={!!row.signature}
                           approvalSignature={row.signature}
                         />
                       ) : (
                         row.signature ? (
                           <span className="text-xs text-gray-600 dark:text-gray-400 break-words max-w-[200px] block">
                             {row.signature}
                           </span>
                         ) : (
                            <span className="text-xs text-gray-400 italic">Not Approved</span>
                         )
                       )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.purposeOfVisit}
                        onChange={(e) => handleInputChange(row.id, 'purposeOfVisit', e.target.value)}
                        className="w-full min-w-[150px]"
                        disabled={!isFormEditable || isPending}
                        placeholder="Purpose"
                      />
                    </td>
                    {/* Actions column only if editable */}
                    {isFormEditable && (
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={!isFormEditable || isPending || rows.length <= 1} // Also check isFormEditable
                          className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title={rows.length <= 1 ? "At least one visit is required" : "Remove visit"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons (Save/Submit) - Only show if editable */}
      {isFormEditable && (
        <div className="flex gap-4 justify-end mt-6 pt-4 border-t dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => handleSaveOrSubmit("DRAFT")}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            onClick={() => handleSaveOrSubmit("SUBMITTED")}
            disabled={isPending || stats.pending > 0}
            className="bg-rose-700 hover:bg-rose-800 text-white"
            title={stats.pending > 0 ? "All visits must be approved before submission" : "Submit form"}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit ({stats.approved}/{stats.total} approved)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Read-only message */}
      {(isAdminView || isSubmitted) && (
        <div className="text-center py-4 text-muted-foreground mt-6 border-t dark:border-gray-700">
          <p className="text-sm">
            {isAdminView ? "Viewing submitted form (read-only)." : "This form is submitted and locked."}
          </p>
        </div>
      )}
    </div>
  );
}