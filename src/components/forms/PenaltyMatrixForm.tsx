"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PenaltyMatrixRow, FORM_CONFIGS } from "@/types/forms";

interface PenaltyMatrixFormProps {
  initialData?: {
    id: string;
    status: string;
    details: PenaltyMatrixRow[];
  } | null;
}

const createNewRow = (id: number): PenaltyMatrixRow => ({
  id, noticeRefNo: "", nonComplianceMonth: "", parameter: "", product: "", penaltyAmount: "0", penaltyDeductedMonth: "", correctiveActionTaken: "", agency: "", agencyAuthorisedPersonSign: "", signOfFpr: "",
});

export const PenaltyMatrixForm = ({ initialData }: PenaltyMatrixFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.penaltyMatrix;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<PenaltyMatrixRow>(
    initialData?.details ?? defaultRow,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    console.log("Saving/Submitting:", { rows, status, formId: initialData?.id });
    toast.info("Save action not yet implemented.");
    setIsPending(false);
  };

  const headers = [
    { label: "Notice Ref No" }, { label: "Non-Compliance Month" }, { label: "Parameter" }, { label: "Product" }, { label: "Penalty Amount" }, { label: "Deducted Month" }, { label: "Corrective Action" }, { label: "Agency" }, { label: "Agency Sign" }, { label: "FPR Sign" },
  ];

  const renderCell = (row: PenaltyMatrixRow, key: keyof PenaltyMatrixRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof PenaltyMatrixRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
