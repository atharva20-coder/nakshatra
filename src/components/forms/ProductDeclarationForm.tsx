"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProductDeclarationRow, FORM_CONFIGS } from "@/types/forms";

interface ProductDeclarationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: ProductDeclarationRow[];
  } | null;
}

const createNewRow = (id: number): ProductDeclarationRow => ({
  id, product: "", bucket: "", countOfCaseAllocated: "0", collectionManagerName: "", collectionManagerLocation: "", cmSign: "",
});

export const ProductDeclarationForm = ({ initialData }: ProductDeclarationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.productDeclaration;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<ProductDeclarationRow>(
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
    { label: "Product" }, { label: "Bucket" }, { label: "Case Count" }, { label: "CM Name" }, { label: "CM Location" }, { label: "CM Sign" },
  ];

  const renderCell = (row: ProductDeclarationRow, key: keyof ProductDeclarationRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof ProductDeclarationRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
