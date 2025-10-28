"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Save, Send, Loader2 } from "lucide-react";
import { saveAgencyVisitAction, deleteAgencyVisitAction } from "@/actions/agency-visit.action";
import { cn } from "@/lib/utils";
import { AgencyTableRow, FORM_CONFIGS } from "@/types/forms";
import { ApprovalButton } from "@/components/approval-button-with-session";
import { CMSessionIndicator } from "@/components/cm-session-indicator";

interface AgencyVisitFormProps {
  initialData?: {
    id: string;
    status: string;
    details: AgencyTableRow[];
  } | null;
  isAdminView?: boolean;  // ADD THIS LINE
}


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

export const AgencyVisitForm = ({ initialData }: AgencyVisitFormProps) => {

// Named export for convenience
// (remove the orphaned export; the component is already exported at the bottom of the file)
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(initialData?.status === 'SUBMITTED');
  const [cmSessionId, setCmSessionId] = useState<string | null>(null);
  const metadata = FORM_CONFIGS.agencyVisits;

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
    const now = new Date();
    // Update signature with collection manager details
    const signatureText = `${approvalData.collectionManager.name} (${approvalData.collectionManager.email})`;
    updateRowValue(rowId, 'signature', signatureText);
    
    // Auto-fill timeout if not already set
    const currentRow = rows.find(r => r.id === rowId);
    if (currentRow && !currentRow.timeOut) {
      updateRowValue(rowId, 'timeOut', now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
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
        router.push(`/user/forms/agencyVisits/${result.formId}`);
      }
      router.refresh();
    }
  };
  
  const handleDelete = async () => {
    if (!initialData?.id) return;
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
      {/* CM Session Indicator */}
      {!isSubmitted && (
        <CMSessionIndicator onSessionChange={(sessionId) => setCmSessionId(sessionId)} />
      )}

      {/* Status Banner */}
      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-center font-medium">
          <p>This form has been submitted and cannot be edited.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{metadata.title}</h2>
          <p className="text-muted-foreground">{metadata.description}</p>
        </div>
        {initialData?.id && !isSubmitted && (
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Draft
          </Button>
        )}
      </div>

      {/* Visit Overview Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Visits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-700">Pending Approval</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-blue-700">Completed</div>
          </div>
        </div>
      )}

      {/* Important Note */}
      {!isSubmitted && !cmSessionId && stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 mt-0.5">⚠️</div>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Collection Manager Login Required</h4>
              <p className="text-sm text-amber-800">
                A Collection Manager must login using the &ldquo;CM Login&rdquo; button (top right) to approve visit records.
                The CM will authenticate with their credentials and can then approve multiple records during their session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CM Session Active Notice */}
      {!isSubmitted && cmSessionId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-0.5">✓</div>
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Collection Manager Active</h4>
              <p className="text-sm text-green-800">
                A Collection Manager is logged in and can now approve records. Click &ldquo;Approve&rdquo; buttons below to process approvals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agency Visits Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Visit Records</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Visit
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bucket/DPD</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CM Approval</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  {!isSubmitted && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={row.id} className={cn("hover:bg-gray-50", index % 2 === 0 ? "bg-white" : "bg-gray-25")}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.srNo}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={row.dateOfVisit}
                        onChange={(e) => handleInputChange(row.id, 'dateOfVisit', e.target.value)}
                        className="w-full min-w-[140px]"
                        disabled={isPending || isSubmitted}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.employeeId}
                        onChange={(e) => handleInputChange(row.id, 'employeeId', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Employee ID"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.employeeName}
                        onChange={(e) => handleInputChange(row.id, 'employeeName', e.target.value)}
                        className="w-full min-w-[150px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.mobileNo}
                        onChange={(e) => handleInputChange(row.id, 'mobileNo', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Mobile"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.branchLocation}
                        onChange={(e) => handleInputChange(row.id, 'branchLocation', e.target.value)}
                        className="w-full min-w-[150px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Branch"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.product}
                        onChange={(e) => handleInputChange(row.id, 'product', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Product"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.bucketDpd}
                        onChange={(e) => handleInputChange(row.id, 'bucketDpd', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Bucket"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={row.timeIn}
                        onChange={(e) => handleInputChange(row.id, 'timeIn', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={isPending || isSubmitted}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={row.timeOut}
                        onChange={(e) => handleInputChange(row.id, 'timeOut', e.target.value)}
                        className="w-full min-w-[120px]"
                        disabled={isPending || isSubmitted}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ApprovalButton
                        rowId={row.id}
                        formType="agencyVisits"
                        formId={initialData?.id || 'draft'}
                        fieldToUpdate="signature"
                        cmSessionId={cmSessionId}
                        onApprovalSuccess={handleApprove}
                        disabled={isPending || isSubmitted}
                        isApproved={!!row.signature}
                        approvalSignature={row.signature}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.purposeOfVisit}
                        onChange={(e) => handleInputChange(row.id, 'purposeOfVisit', e.target.value)}
                        className="w-full min-w-[150px]"
                        disabled={isPending || isSubmitted}
                        placeholder="Purpose"
                      />
                    </td>
                    {!isSubmitted && (
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={isPending || rows.length <= 1}
                          className="hover:bg-red-50 hover:text-red-600"
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

      {/* Action Buttons */}
      {!isSubmitted && (
        <div className="flex gap-4 justify-end">
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
    </div>
  );
}