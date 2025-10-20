"use client";

import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { saveAssetManagementAction, deleteAssetManagementAction } from "@/actions/asset-management.action";
import { cn } from "@/lib/utils";
import { AssetManagementRow, FORM_CONFIGS } from "@/types/forms";

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
  const [isSubmitted, setIsSubmitted] = useState(initialData?.status === 'SUBMITTED');
  const metadata = FORM_CONFIGS.assetManagement;

  const { rows, addRow, removeRow, handleInputChange } = useTableRows<AssetManagementRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );
  
  useEffect(() => {
    setIsSubmitted(initialData?.status === 'SUBMITTED');
  }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveAssetManagementAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        setIsSubmitted(true);
        router.push("/user/dashboard");
      } else if (result.formId) {
        router.push(`/user/forms/assetManagement/${result.formId}`);
      }
      router.refresh();
    }
  };
  
  const handleDelete = async () => {
    if (!initialData?.id) return;
    setIsPending(true);
    const result = await deleteAssetManagementAction(initialData.id);
    setIsPending(false);
    if(result.error) {
      toast.error(result.error);
    } else {
      toast.success("Draft deleted successfully");
      router.push('/user/dashboard');
      router.refresh();
    }
  }

  const headers = [
    { label: "Sr No" }, { label: "System/CPU Serial No" }, { label: "IP Address" },
    { label: "Executive Name" }, { label: "ID Card No" }, { label: "Printer Access" },
    { label: "Asset Disposed Info" }, { label: "Actions" }
  ];

  const renderCell = (row: AssetManagementRow, key: keyof AssetManagementRow | 'actions') => {
    if (key === 'actions') {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeRow(row.id)}
          disabled={isPending || isSubmitted || rows.length <= 1}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    }
    
    return (
      <Input
        type="text"
        value={row[key as keyof AssetManagementRow]}
        onChange={(e) => handleInputChange(row.id, key as keyof AssetManagementRow, e.target.value)}
        className={cn("w-full min-w-[180px]")}
        disabled={isPending || isSubmitted}
      />
    );
  };

  return (
    <div className="space-y-4">
      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-center font-medium">
          <p>This form has been submitted and cannot be edited.</p>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold">{metadata.title}</h2>
            <p className="text-muted-foreground">{metadata.description}</p>
        </div>
        {initialData?.id && !isSubmitted && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                Delete Draft
            </Button>
        )}
      </div>
      <TableForm
        headers={headers}
        rows={rows}
        renderCell={(row, key) => renderCell(row as AssetManagementRow, key as keyof AssetManagementRow | 'actions')}
        onAddRow={addRow}
        onSave={() => handleSaveOrSubmit("DRAFT")}
        onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
        isPending={isPending}
        showActions={!isSubmitted}
      />
    </div>
  );
};

