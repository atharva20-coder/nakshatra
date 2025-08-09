// src/app/agency/visit-details/page.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState } from "react";
import { toast } from "sonner";
import { ApprovalButton } from "@/components/approval-button";
import { TableForm } from "@/components/table-forms";
import { cn } from "@/lib/utils";
import { getAgencyVisitDetailsColumns } from "@/lib/table-definitions";

// Interface for the table row data
export interface AgencyTableRow {
  id: number;
  dbId?: string;
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

export default function AgencyVisitDetailsPage() {
  const { rows, addRow, handleInputChange, updateRowValue, saveRow, isLoading } = useTableRows(
    "agencyVisit",
    createNewAgencyRow
  );
  const [isPending, setIsPending] = useState(false);
  const columns = getAgencyVisitDetailsColumns();

  const handleApprovalSuccess = (rowId: number) => {
    const now = new Date();
    updateRowValue(rowId, "timeOut", now.toLocaleTimeString());
    updateRowValue(rowId, "signature", "Approved by Bank Manager");
  };

  const handleSaveAll = async () => {
    setIsPending(true);
    await Promise.all(
      rows.map((row) => !row.dbId && saveRow(row))
    );
    setIsPending(false);
  };

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
            key as keyof Omit<AgencyTableRow, "id" | "dbId">,
            e.target.value
          )
        }
        className={cn("w-full min-w-[180px]", minWidths[key])}
        readOnly={key === "srNo" || key === "dateOfVisit" || key === "timeIn" || key === "timeOut"}
        disabled={isPending || isLoading}
        required
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/agency" returnLabel="Back to Agency Dashboard" />

      <main className="p-8">
        <div className="container mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Agency Visit Details
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {isLoading ? (
                <div className="p-8 text-center">Loading...</div>
            ) : (
            <TableForm
              headers={columns}
              rows={rows}
              renderCell={renderCell}
              onAddRow={addRow}
              onSave={handleSaveAll}
              onSubmit={() => {}}
              isPending={isPending}
            />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};