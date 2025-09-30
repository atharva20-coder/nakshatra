"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RepoKitTrackerRow, FORM_CONFIGS } from "@/types/forms";
import { saveRepoKitTrackerAction } from "@/actions/repo-kit-tracker.action";

interface RepoKitTrackerFormProps {
  initialData?: {
    id: string;
    status: string;
    details: RepoKitTrackerRow[];
  } | null;
}

const createNewRow = (id: number): RepoKitTrackerRow => ({
  id, srNo: String(id), repoKitNo: "", issueDateFromBank: new Date().toLocaleDateString(), lanNo: "", product: "", bucketDpd: "", usedUnused: "Unused", executiveSign: "", dateOfReturnToCo: "", collectionManagerEmpId: "", collectionManagerSign: "",
});

export const RepoKitTrackerForm = ({ initialData }: RepoKitTrackerFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.repoKitTracker;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<RepoKitTrackerRow>(
    initialData?.details ?? defaultRow,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveRepoKitTrackerAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      router.push("/dashboard");
      router.refresh();
    }
  };

  const headers = [
    { label: "Sr No" }, { label: "Repo Kit No" }, { label: "Issue Date" }, { label: "LAN No" }, { label: "Product" }, { label: "Bucket/DPD" }, { label: "Used/Unused" }, { label: "Executive Sign" }, { label: "Return Date" }, { label: "CM Emp ID" }, { label: "CM Sign" },
  ];

  const renderCell = (row: RepoKitTrackerRow, key: keyof RepoKitTrackerRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof RepoKitTrackerRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
