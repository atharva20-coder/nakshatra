"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ManpowerRegisterRow, FORM_CONFIGS } from "@/types/forms";

interface ManpowerRegisterFormProps {
  initialData?: {
    id: string;
    status: string;
    details: ManpowerRegisterRow[];
  } | null;
}

const createNewRow = (id: number): ManpowerRegisterRow => ({
    id, srNo: String(id), executiveCategory: "", hhdIdOfFos: "", axisIdOfFos: "", fosFullName: "", dateOfJoining: new Date().toLocaleDateString(), product: "", cocSigned: "No", collectionManagerName: "", collectionManagerId: "", collectionManagerSign: "", dateOfResignation: "", idCardsIssuanceDate: "", idCardReturnDate: "", executiveSignature: "", remarks: "",
});

export const ManpowerRegisterForm = ({ initialData }: ManpowerRegisterFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.manpowerRegister;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<ManpowerRegisterRow>(
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
    { label: "Sr No" }, { label: "Executive Category" }, { label: "HHD ID" }, { label: "Axis ID" }, { label: "Full Name" }, { label: "Date of Joining" }, { label: "Product" }, { label: "COC Signed" }, { label: "CM Name" }, { label: "CM ID" }, { label: "CM Sign" }, { label: "Date of Resignation" }, { label: "ID Issuance Date" }, { label: "ID Return Date" }, { label: "Executive Signature" }, { label: "Remarks" },
  ];

  const renderCell = (row: ManpowerRegisterRow, key: keyof ManpowerRegisterRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof ManpowerRegisterRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
