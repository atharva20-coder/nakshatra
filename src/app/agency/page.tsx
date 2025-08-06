"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState } from "react";
import { saveAgencyVisitAction } from "@/actions/save-agency-visit.action";
import { toast } from "sonner";
import { ApprovalButton } from "@/components/approval-button";
import { TableForm } from "@/components/table-form";
import { cn } from "@/lib/utils";

// Interface for the table row data
export interface AgencyTableRow {
  id: number;
  srNo: string;
  dateOfVisit: string;
  employeeId: string;
  employeeName: string;
  mobileNo: string;
  branchLocation: string;
  product: string;
  bucketDpd: string;
  timeIn: string;
  timeOut: string;
  signature: string;
  purposeOfVisit: string;
}

// Factory function for creating a new row
const createNewAgencyRow = (id: number): AgencyTableRow => {
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

export default function AgencyPage() {
  const { rows, addRow, handleInputChange, updateRowValue } = useTableRows(
    1, // Table now starts with only one row
    createNewAgencyRow
  );
  const [isPending, setIsPending] = useState(false);

  const handleApprovalSuccess = (rowId: number) => {
    const now = new Date();
    updateRowValue(rowId, "timeOut", now.toLocaleTimeString());
    updateRowValue(rowId, "signature", "Approved by Bank Manager");
  };

  const validateRows = (isSubmitting: boolean) => {
    for (const row of rows) {
      const fieldsToValidate: (keyof Omit<AgencyTableRow, "id">)[] = [
        "employeeId", "employeeName", "mobileNo", "branchLocation", 
        "product", "bucketDpd", "purposeOfVisit"
      ];

      for (const field of fieldsToValidate) {
        if (!row[field] || row[field].trim() === '') {
          toast.error(`Please fill out all fields in row ${row.srNo}.`);
          return false;
        }
      }
      
      if (isSubmitting && !row.signature) {
        toast.error(`Row ${row.srNo} must be approved before submitting.`);
        return false;
      }
    }
    return true;
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    const isSubmitting = status === "SUBMITTED";
    if (!validateRows(isSubmitting)) {
      return;
    }

    setIsPending(true);
    // FIX: Correctly destructure to exclude 'id' and resolve ESLint warning.
    const rowsToSave = rows.map(({ id, ...rest }) => rest);
    
    const result = await saveAgencyVisitAction(rowsToSave, status);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `Visit successfully ${status === "DRAFT" ? "saved" : "submitted"}!`
      );
    }

    setIsPending(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    cellIndex: number
  ) => {
    if (
      e.key === "Tab" &&
      !e.shiftKey &&
      rowIndex === rows.length - 1 &&
      cellIndex === 11
    ) {
      e.preventDefault();
      addRow();
      setTimeout(() => {
        const nextInput = document.querySelector<HTMLInputElement>(
          `[data-row-index="${rowIndex + 1}"][data-cell-index="1"]`
        );
        nextInput?.focus();
      }, 0);
    }
  };

  const headers = [
    { label: "Sr. No" },
    { label: "Date of Visit" },
    { label: "Employee ID" },
    { label: "Employee name" },
    { label: "Mobile No." },
    { label: "Branch Location" },
    { label: "Product" },
    { label: "Bucket/DPD" },
    { label: "Time In" },
    { label: "Time Out" },
    { label: "Signature" },
    { label: "Purpose of Visit" },
  ];

  const renderCell = (row: AgencyTableRow, key: keyof AgencyTableRow, rowIndex: number, cellIndex: number) => {
    if (key === 'signature') {
      return row.signature ? (
        <span className="text-green-600 font-semibold">{row.signature}</span>
      ) : (
        <ApprovalButton 
          rowId={row.id} 
          onApprovalSuccess={handleApprovalSuccess} 
        />
      );
    }
    
    // Define minimum widths for different columns to ensure visibility
    const minWidths: { [key in keyof AgencyTableRow]?: string } = {
        srNo: 'min-w-[60px]',
        employeeName: 'min-w-[250px]',
        branchLocation: 'min-w-[250px]',
        purposeOfVisit: 'min-w-[300px]',
        dateOfVisit: 'min-w-[120px]',
        mobileNo: 'min-w-[150px]',
        timeIn: 'min-w-[120px]',
        timeOut: 'min-w-[120px]',
    };

    return (
      <Input
        type="text"
        value={row[key]}
        onChange={(e) =>
          handleInputChange(
            row.id,
            key as keyof Omit<AgencyTableRow, "id">,
            e.target.value
          )
        }
        onKeyDown={(e) => handleKeyDown(e, rowIndex, cellIndex)}
        data-row-index={rowIndex}
        data-cell-index={cellIndex}
        className={cn("w-full min-w-[180px]", minWidths[key])}
        readOnly={key === "srNo" || key === "dateOfVisit" || key === "timeIn" || key === "timeOut"}
        disabled={isPending}
        required
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/profile" returnLabel="Back to Profile" />

      <main className="p-8">
        <div className="container mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Bank Manager Agency Visit Register
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Agency Visit Details
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <TableForm
              headers={headers}
              rows={rows}
              renderCell={renderCell}
              onAddRow={addRow}
              onSave={() => handleSaveOrSubmit("DRAFT")}
              onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
              isPending={isPending}
            />
          </div>
        </div>
      </main>
    </div>
  );
};