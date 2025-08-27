"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EscalationDetailsRow, FORM_CONFIGS } from "@/types/forms";
// This action will need to be created in a separate step
// import { saveEscalationDetailsAction } from "@/actions/escalation-details.action";

interface EscalationDetailsFormProps {
  initialData?: {
    id: string;
    status: string;
    details: EscalationDetailsRow[];
  } | null;
}

const createNewRow = (id: number): EscalationDetailsRow => ({
  id, customerName: "", loanCardNo: "", productBucketDpd: "", dateEscalation: new Date().toLocaleDateString(), escalationDetail: "", collectionManagerRemark: "", collectionManagerSign: "",
});

export const EscalationDetailsForm = ({ initialData }: EscalationDetailsFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.escalationDetails;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<EscalationDetailsRow>(
    initialData?.details ?? defaultRow,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    console.log("Saving/Submitting:", { rows, status, formId: initialData?.id });
    toast.info("Save action not yet implemented.");
    // const result = await saveEscalationDetailsAction(rows.map(({id, ...rest}) => rest), status, initialData?.id);
    setIsPending(false);
  };

  const headers = [
    { label: "Customer Name" }, { label: "Loan/Card No" }, { label: "Product/Bucket/DPD" }, { label: "Date of Escalation" }, { label: "Escalation Detail" }, { label: "CM Remark" }, { label: "CM Sign" },
  ];

  const renderCell = (row: EscalationDetailsRow, key: keyof EscalationDetailsRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof EscalationDetailsRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
