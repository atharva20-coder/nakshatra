"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PaymentRegisterRow, FORM_CONFIGS } from "@/types/forms";
// This action will need to be created in a separate step
// import { savePaymentRegisterAction } from "@/actions/payment-register.action";

interface PaymentRegisterFormProps {
  initialData?: {
    id: string;
    status: string;
    details: PaymentRegisterRow[];
  } | null;
}

const createNewRow = (id: number): PaymentRegisterRow => ({
  id, srNo: String(id), month: "", eReceiptNo: "", accountNo: "", customerName: "", receiptAmount: "0", modeOfPayment: "", depositionDate: new Date().toLocaleDateString(), fosHhdId: "", fosName: "", fosSign: "", cmName: "", cmVerificationStatus: "", remarks: "",
});

export const PaymentRegisterForm = ({ initialData }: PaymentRegisterFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.paymentRegister;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<PaymentRegisterRow>(
    initialData?.details ?? defaultRow,
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    console.log("Saving/Submitting:", { rows, status, formId: initialData?.id });
    toast.info("Save action not yet implemented.");
    // const result = await savePaymentRegisterAction(rows.map(({id, ...rest}) => rest), status, initialData?.id);
    setIsPending(false);
  };

  const headers = [
    { label: "Sr No" }, { label: "Month" }, { label: "E-Receipt No" }, { label: "Account No" }, { label: "Customer Name" }, { label: "Receipt Amount" }, { label: "Mode of Payment" }, { label: "Deposition Date" }, { label: "FOS HHD ID" }, { label: "FOS Name" }, { label: "FOS Sign" }, { label: "CM Name" }, { label: "CM Verification" }, { label: "Remarks" },
  ];

  const renderCell = (row: PaymentRegisterRow, key: keyof PaymentRegisterRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof PaymentRegisterRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
