"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProactiveEscalationRow, FORM_CONFIGS } from "@/types/forms";

interface ProactiveEscalationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: ProactiveEscalationRow[];
  } | null;
}

const createNewRow = (id: number): ProactiveEscalationRow => ({
  id, lanCardNo: "", customerName: "", product: "", currentBucket: "", dateOfContact: new Date().toLocaleDateString(), modeOfContact: "Field Visit", dateOfTrailUploaded: "", listOfCaseWithReasons: "", collectionManagerNameId: "",
});

export const ProactiveEscalationForm = ({ initialData }: ProactiveEscalationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.proactiveEscalation;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<ProactiveEscalationRow>(
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
    { label: "LAN/Card No" }, { label: "Customer Name" }, { label: "Product" }, { label: "Current Bucket" }, { label: "Date of Contact" }, { label: "Mode of Contact" }, { label: "Trail Uploaded Date" }, { label: "Case Reasons" }, { label: "CM Name/ID" },
  ];

  const renderCell = (row: ProactiveEscalationRow, key: keyof ProactiveEscalationRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof ProactiveEscalationRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
