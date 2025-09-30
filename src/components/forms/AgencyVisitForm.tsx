"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { saveAgencyVisitAction, deleteAgencyVisitAction } from "@/actions/agency-visit.action";
import { cn } from "@/lib/utils";
import { AgencyTableRow, FORM_CONFIGS } from "@/types/forms";

interface AgencyVisitFormProps {
  initialData?: {
    id: string;
    status: string;
    details: AgencyTableRow[];
  } | null;
}

const createNewRow = (id: number): AgencyTableRow => {
  const now = new Date();
  return {
    id,
    srNo: String(id),
    dateOfVisit: now.toLocaleDateString(),
    employeeId: "",
    employeeName: "",
    mobileNo: "",
    branchLocation: "",
    product: "",
    bucketDpd: "",
    timeIn: now.toLocaleTimeString(),
    timeOut: "",
    signature: "",
    purposeOfVisit: "",
  };
};

export const AgencyVisitForm = ({ initialData }: AgencyVisitFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(initialData?.status === 'SUBMITTED');
  const metadata = FORM_CONFIGS.agencyVisits;

  const { rows, addRow, removeRow, handleInputChange, updateRowValue } = useTableRows<AgencyTableRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );
  
  useEffect(() => {
    setIsSubmitted(initialData?.status === 'SUBMITTED');
  }, [initialData]);

  const handleApprove = (rowId: number | string) => {
    const now = new Date();
    updateRowValue(rowId, 'signature', 'Approved by Manager');
    updateRowValue(rowId, 'timeOut', now.toLocaleTimeString());
    toast.success(`Visit approved successfully!`);
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveAgencyVisitAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        setIsSubmitted(true);
        router.push("/dashboard");
      } else if (result.formId) {
        router.push(`/forms/agencyVisits/${result.formId}`);
      }
      router.refresh();
    }
  };
  
  const handleDelete = async () => {
    if (!initialData?.id) return;
    setIsPending(true);
    const result = await deleteAgencyVisitAction(initialData.id);
    setIsPending(false);
    if(result.error) {
      toast.error(result.error);
    } else {
      toast.success("Draft deleted successfully");
      router.push('/dashboard');
      router.refresh();
    }
  };

  const getVisitStats = () => {
    const total = rows.length;
    const approved = rows.filter(r => r.signature && r.signature.includes('Approved')).length;
    const pending = rows.filter(r => !r.signature || !r.signature.includes('Approved')).length;
    const completed = rows.filter(r => r.timeOut && r.timeOut !== '').length;
    
    return { total, approved, pending, completed };
  };
  const stats = getVisitStats();

  return (
    <div className="space-y-6">
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
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-blue-700">Completed</div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sr. No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Visit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bucket/DPD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signature
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose of Visit
                  </th>
                  {!isSubmitted && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={row.id} className={cn("hover:bg-gray-50", index % 2 === 0 ? "bg-white" : "bg-gray-25")}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.srNo}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.dateOfVisit}
                        onChange={(e) => handleInputChange(row.id, 'dateOfVisit', e.target.value)}
                        className="w-full min-w-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.employeeId}
                        onChange={(e) => handleInputChange(row.id, 'employeeId', e.target.value)}
                        className="w-full min-w-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Employee ID"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.employeeName}
                        onChange={(e) => handleInputChange(row.id, 'employeeName', e.target.value)}
                        className="w-full min-w-[150px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Employee Name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.mobileNo}
                        onChange={(e) => handleInputChange(row.id, 'mobileNo', e.target.value)}
                        className="w-full min-w-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Mobile No."
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.branchLocation}
                        onChange={(e) => handleInputChange(row.id, 'branchLocation', e.target.value)}
                        className="w-full min-w-[150px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Branch Location"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.product}
                        onChange={(e) => handleInputChange(row.id, 'product', e.target.value)}
                        className="w-full min-w-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Product"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.bucketDpd}
                        onChange={(e) => handleInputChange(row.id, 'bucketDpd', e.target.value)}
                        className="w-full min-w-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Bucket/DPD"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.timeIn}
                        onChange={(e) => handleInputChange(row.id, 'timeIn', e.target.value)}
                        className="w-full min-w-[100px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Time In"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.timeOut}
                        onChange={(e) => handleInputChange(row.id, 'timeOut', e.target.value)}
                        className="w-full min-w-[100px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Time Out"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.signature ? (
                        <span className="text-green-600 font-semibold text-sm">
                          {row.signature}
                        </span>
                      ) : !isSubmitted ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(row.id)}
                          disabled={isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">Not approved</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={row.purposeOfVisit}
                        onChange={(e) => handleInputChange(row.id, 'purposeOfVisit', e.target.value)}
                        className="w-full min-w-[150px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isPending || isSubmitted}
                        placeholder="Purpose of Visit"
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
            {isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button 
            onClick={() => handleSaveOrSubmit("SUBMITTED")}
            disabled={isPending}
            className="bg-rose-700 hover:bg-rose-800 text-white"
          >
            {isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
};