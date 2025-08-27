"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MonthlyComplianceRow, FORM_CONFIGS } from "@/types/forms";
// This action will need to be created in a separate step
// import { saveMonthlyComplianceAction } from "@/actions/monthly-compliance.action";

interface MonthlyComplianceFormProps {
  initialData?: {
    id: string;
    status: string;
    details: MonthlyComplianceRow[];
  } | null;
}

const createNewRow = (id: number): MonthlyComplianceRow => ({
  id,
  srNo: String(id),
  complianceParameters: "",
  complied: "No",
  agencyRemarks: "",
  collectionManagerName: "",
  collectionManagerEmpId: "",
  collectionManagerSign: "",
  date: new Date().toLocaleDateString(),
});

export const MonthlyComplianceForm = ({ initialData }: MonthlyComplianceFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.monthlyCompliance;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<MonthlyComplianceRow>(
    initialData?.details ?? defaultRow,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    console.log("Saving/Submitting:", { rows, status, formId: initialData?.id });
    toast.info("Save action not yet implemented.");
    // const result = await saveMonthlyComplianceAction(rows.map(({id, ...rest}) => rest), status, initialData?.id);
    setIsPending(false);
  };

  const headers = [
    { label: "Sr No" }, { label: "Compliance Parameters" }, { label: "Complied (Yes/No/NA)" },
    { label: "Agency Remarks" }, { label: "CM Name" }, { label: "CM Emp ID" },
    { label: "CM Sign" }, { label: "Date" },
  ];

  const renderCell = (row: MonthlyComplianceRow, key: keyof MonthlyComplianceRow) => (
    <Input
      type="text"
      value={row[key]}
      onChange={(e) => handleInputChange(row.id, key, e.target.value)}
      className={cn("w-full min-w-[180px]")}
      disabled={isPending || initialData?.status === 'SUBMITTED'}
    />
  );

  return (
    <TableForm
      headers={headers}
      rows={rows}
      renderCell={(row, key) => renderCell(row, key as keyof MonthlyComplianceRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
