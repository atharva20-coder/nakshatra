"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DeclarationManagerRow, FORM_CONFIGS } from "@/types/forms";

interface DeclarationCumUndertakingFormProps {
  initialData?: {
    id: string;
    status: string;
    details: DeclarationManagerRow[];
  } | null;
}

const createNewRow = (id: number): DeclarationManagerRow => ({
  id,
  collectionManagerName: "",
  collectionManagerEmployeeId: "",
  collectionManagerSignature: "",
});

export const DeclarationCumUndertakingForm = ({ initialData }: DeclarationCumUndertakingFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.declarationCumUndertaking;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<DeclarationManagerRow>(
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
    { label: "Collection Manager Name" },
    { label: "Employee ID" },
    { label: "Signature" },
  ];

  const renderCell = (row: DeclarationManagerRow, key: keyof DeclarationManagerRow) => (
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
      title={metadata.title}
      headers={headers}
      rows={rows}
      renderCell={(row, key) => renderCell(row, key as keyof DeclarationManagerRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
