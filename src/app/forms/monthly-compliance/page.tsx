// src/app/forms/monthly-compliance/page.tsx
"use client";

import { UniversalForm } from "@/components/universal-form";
import { Input } from "@/components/ui/input";
import { MonthlyComplianceRow } from "@/types/forms";
import { ApprovalButton } from "@/components/approval-button";

const createMonthlyComplianceRow = (id: number): MonthlyComplianceRow => ({
  id,
  srNo: String(id),
  complianceParameters: "",
  complied: "",
  agencyRemarks: "",
  collectionManagerName: "",
  collectionManagerEmpId: "",
  collectionManagerSign: "",
  date: new Date().toISOString().split('T')[0],
});

const headers = [
  { label: "Sr. No." },
  { label: "Compliance Parameters" },
  { label: "Complied (Yes/No/NA)" },
  { label: "Agency Remarks" },
  { label: "Collection Manager Name" },
  { label: "Collection Manager Emp-ID" },
  { label: "Collection Manager Signature" },
  { label: "Date" },
];

const validateRow = (row: MonthlyComplianceRow): string | null => {
  if (!row.complianceParameters.trim()) return `Please enter compliance parameters for row ${row.srNo}`;
  if (!row.complied.trim()) return `Please specify compliance status for row ${row.srNo}`;
  if (!['Yes', 'No', 'NA'].includes(row.complied)) return `Compliance status must be Yes, No, or NA for row ${row.srNo}`;
  if (!row.collectionManagerName.trim()) return `Please enter collection manager name for row ${row.srNo}`;
  if (!row.collectionManagerEmpId.trim()) return `Please enter collection manager ID for row ${row.srNo}`;
  if (!row.date) return `Please select date for row ${row.srNo}`;
  return null;
};

const renderCell = (
  row: MonthlyComplianceRow,
  key: keyof MonthlyComplianceRow,
  rowIndex: number,
  cellIndex: number,
  isPending: boolean,
  updateRowValue: (rowId: number, key: keyof MonthlyComplianceRow, value: string) => void
) => {
  if (key === 'collectionManagerSign') {
    return row.collectionManagerSign ? (
      <span className="text-green-600 font-semibold">{row.collectionManagerSign}</span>
    ) : (
      <ApprovalButton 
        rowId={row.id} 
        onApprovalSuccess={(rowId) => updateRowValue(rowId, 'collectionManagerSign', 'CM Approved')} 
      />
    );
  }

  if (key === 'complied') {
    return (
      <select
        value={row[key]}
        onChange={(e) => updateRowValue(row.id, key, e.target.value)}
        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
        disabled={isPending}
        required
      >
        <option value="">Select</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
        <option value="NA">NA</option>
      </select>
    );
  }

  if (key === 'date') {
    return (
      <Input
        type="date"
        value={row[key]}
        onChange={(e) => updateRowValue(row.id, key, e.target.value)}
        className="w-full min-w-[150px]"
        disabled={isPending}
        required
      />
    );
  }

  const minWidths: { [key in keyof MonthlyComplianceRow]?: string } = {
    srNo: 'min-w-[60px]',
    complianceParameters: 'min-w-[300px]',
    agencyRemarks: 'min-w-[200px]',
    collectionManagerName: 'min-w-[200px]',
    collectionManagerEmpId: 'min-w-[150px]',
  };

  return (
    <Input
      type="text"
      value={row[key]}
      onChange={(e) => updateRowValue(row.id, key, e.target.value)}
      className={`w-full ${minWidths[key] || 'min-w-[150px]'}`}
      readOnly={key === "srNo"}
      disabled={isPending}
      required
    />
  );
};

export default function MonthlyCompliancePage() {
  return (
    <UniversalForm
      formType="monthlyCompliance"
      rowFactory={createMonthlyComplianceRow}
      headers={headers}
      renderCell={renderCell}
      validateRow={validateRow}
      requiresApproval={true}
    />
  );
}