// src/app/forms/code-of-conduct/page.tsx
"use client";

import { UniversalForm } from "@/components/universal-form";
import { Input } from "@/components/ui/input";
import { CodeOfConductRow } from "@/types/forms";
import { ApprovalButton } from "@/components/approval-button";

const createCodeOfConductRow = (id: number): CodeOfConductRow => ({
  id,
  name: "",
  signature: "",
  date: new Date().toISOString().split('T')[0],
});

const headers = [
  { label: "Name (Proprietor/Partner/Director)" },
  { label: "Signature" },
  { label: "Date" },
];

const validateRow = (row: CodeOfConductRow): string | null => {
  if (!row.name.trim()) return `Please enter name for entry ${row.id}`;
  if (!row.date) return `Please select date for entry ${row.id}`;
  if (!row.signature.trim()) return `Please provide signature for entry ${row.id}`;
  return null;
};

const renderCell = (
  row: CodeOfConductRow,
  key: keyof CodeOfConductRow,
  rowIndex: number,
  cellIndex: number,
  isPending: boolean,
  updateRowValue: (rowId: number, key: keyof CodeOfConductRow, value: string) => void
) => {
  if (key === 'signature') {
    return row.signature ? (
      <span className="text-green-600 font-semibold">{row.signature}</span>
    ) : (
      <ApprovalButton 
        rowId={row.id} 
        onApprovalSuccess={(rowId) => updateRowValue(rowId, 'signature', 'Digitally Signed')} 
      />
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

  return (
    <Input
      type="text"
      value={row[key]}
      onChange={(e) => updateRowValue(row.id, key, e.target.value)}
      className="w-full min-w-[200px]"
      disabled={isPending}
      required
    />
  );
};

export default function CodeOfConductPage() {
  return (
    <UniversalForm
      formType="codeOfConduct"
      rowFactory={createCodeOfConductRow}
      headers={headers}
      renderCell={renderCell}
      validateRow={validateRow}
      requiresApproval={true}
    />
  );
}