"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AssetManagementRow, FORM_CONFIGS } from "@/types/forms";
// This action will need to be created in a separate step
// import { saveAssetManagementAction } from "@/actions/asset-management.action";

interface AssetManagementFormProps {
  initialData?: {
    id: string;
    status: string;
    details: AssetManagementRow[];
  } | null;
}

const createNewRow = (id: number): AssetManagementRow => ({
  id,
  srNo: String(id),
  systemCpuSerialNo: "",
  ipAddress: "",
  executiveName: "",
  idCardNumber: "",
  printerAccess: "No",
  assetDisposed: "",
});

export const AssetManagementForm = ({ initialData }: AssetManagementFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.assetManagement;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<AssetManagementRow>(
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
    { label: "Sr No" }, { label: "System/CPU Serial No" }, { label: "IP Address" },
    { label: "Executive Name" }, { label: "ID Card No" }, { label: "Printer Access" },
    { label: "Asset Disposed Info" },
  ];

  const renderCell = (row: AssetManagementRow, key: keyof AssetManagementRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof AssetManagementRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
