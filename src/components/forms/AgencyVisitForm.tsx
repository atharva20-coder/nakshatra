"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveAgencyVisitAction } from "@/actions/agency-visit.action";
import { cn } from "@/lib/utils";
import { AgencyTableRow, FORM_CONFIGS } from "@/types/forms";

interface AgencyVisitFormProps {
  initialData?: {
    id: string;
    status: string;
    details: AgencyTableRow[];
  } | null;
}

const createNewRow = (id: number): AgencyTableRow => {
    const now = new Date();
    return {
      id,
      srNo: String(id),
      dateOfVisit: now.toLocaleDateString(),
      employeeId: "",
      employeeName: "",
      mobileNo: "",
      branchLocation: "",
      product: "",
      bucketDpd: "",
      timeIn: now.toLocaleTimeString(),
      timeOut: "",
      signature: "",
      purposeOfVisit: "",
    };
  };

export const AgencyVisitForm = ({ initialData }: AgencyVisitFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.agencyVisits;

  const { rows, addRow, handleInputChange, updateRowValue } = useTableRows<AgencyTableRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );

  const handleApprove = (rowId: number | string) => {
    const now = new Date();
    updateRowValue(rowId, 'signature', 'Approved by Manager');
    updateRowValue(rowId, 'timeOut', now.toLocaleTimeString());
    toast.success(`Row ${rowId} approved successfully!`);
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveAgencyVisitAction(rowsToSubmit, status, initialData?.id);
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
    { label: "Sr. No" }, { label: "Date of Visit" }, { label: "Employee ID" },
    { label: "Employee name" }, { label: "Mobile No." }, { label: "Branch Location" },
    { label: "Product" }, { label: "Bucket/DPD" }, { label: "Time In" },
    { label: "Time Out" }, { label: "Signature" }, { label: "Purpose of Visit" },
  ];

  const renderCell = (row: AgencyTableRow, key: keyof AgencyTableRow) => {
    if (key === 'signature') {
      return row.signature ? (
        <span className="text-green-600 font-semibold">{row.signature}</span>
      ) : (
        <Button size="sm" onClick={() => handleApprove(row.id)}>
          Approve
        </Button>
      );
    }

    return (
      <Input
        type="text"
        value={row[key]}
        onChange={(e) => handleInputChange(row.id, key, e.target.value)}
        className={cn("w-full min-w-[180px]")}
        disabled={isPending || initialData?.status === 'SUBMITTED'}
      />
    );
  };

  return (
    <TableForm
      headers={headers}
      rows={rows}
      renderCell={(row, key) => renderCell(row as AgencyTableRow, key as keyof AgencyTableRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
