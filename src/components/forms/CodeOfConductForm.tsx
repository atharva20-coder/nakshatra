"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// This action will need to be created in a separate step
// import { saveCodeOfConductAction } from "@/actions/code-of-conduct.action"; 
import { cn } from "@/lib/utils";
import { CodeOfConductRow, FORM_CONFIGS } from "@/types/forms";

interface CodeOfConductFormProps {
  initialData?: {
    id: string;
    status: string;
    details: CodeOfConductRow[];
  } | null;
}

const createNewRow = (id: number): CodeOfConductRow => {
    const now = new Date();
    return {
      id,
      name: "",
      signature: "",
      date: now.toLocaleDateString(),
    };
  };

export const CodeOfConductForm = ({ initialData }: CodeOfConductFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.codeOfConduct;

  const { rows, addRow, handleInputChange } = useTableRows<CodeOfConductRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    // Placeholder for the save action
    console.log("Saving/Submitting:", { rows, status, formId: initialData?.id });
    // const result = await saveCodeOfConductAction(rows, status, initialData?.id);
    setIsPending(false);
    
    toast.info("Save action not yet implemented.");
    // if (result.error) {
    //   toast.error(result.error);
    // } else {
    //   toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
    //   router.push("/dashboard");
    //   router.refresh();
    // }
  };

  const headers = [
    { label: "Name (Proprietor/Partner/Director)" },
    { label: "Signature" },
    { label: "Date" },
  ];

  const renderCell = (row: CodeOfConductRow, key: keyof CodeOfConductRow) => {
    return (
      <Input
        type={key === 'date' ? 'date' : 'text'}
        value={row[key]}
        onChange={(e) => handleInputChange(row.id, key, e.target.value)}
        className={cn("w-full min-w-[180px]")}
        disabled={isPending || initialData?.status === 'SUBMITTED'}
      />
    );
  };

  return (
    <TableForm
      title={metadata.title}
      headers={headers}
      rows={rows}
      renderCell={(row, key) => renderCell(row as CodeOfConductRow, key as keyof CodeOfConductRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
