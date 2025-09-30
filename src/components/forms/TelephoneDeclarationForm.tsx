"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TelephoneDeclarationRow, FORM_CONFIGS } from "@/types/forms";

interface TelephoneDeclarationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: TelephoneDeclarationRow[];
  } | null;
}

const createNewRow = (id: number): TelephoneDeclarationRow => ({
  id,
  srNo: String(id),
  telephoneNo: "",
  username: "",
  executiveCategory: "",
  recordingLine: "No",
  remarks: "",
});

export const TelephoneDeclarationForm = ({ initialData }: TelephoneDeclarationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.telephoneDeclaration;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<TelephoneDeclarationRow>(
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
    { label: "Sr No" }, { label: "Telephone No" }, { label: "Username" },
    { label: "Executive Category" }, { label: "Recording Line" }, { label: "Remarks" },
  ];

  const renderCell = (row: TelephoneDeclarationRow, key: keyof TelephoneDeclarationRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof TelephoneDeclarationRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
