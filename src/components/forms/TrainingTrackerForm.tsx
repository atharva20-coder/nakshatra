"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TrainingTrackerRow, FORM_CONFIGS } from "@/types/forms";

interface TrainingTrackerFormProps {
  initialData?: {
    id: string;
    status: string;
    details: TrainingTrackerRow[];
  } | null;
}

const createNewRow = (id: number): TrainingTrackerRow => ({
  id, dateOfTraining: new Date().toLocaleDateString(), trainingAgenda: "", trainingName: "", trainerName: "", trainerEmpId: "", noOfAttendees: "0", trainerRemarks: "",
});

export const TrainingTrackerForm = ({ initialData }: TrainingTrackerFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const metadata = FORM_CONFIGS.trainingTracker;

  const defaultRow = useMemo(() => [createNewRow(1)], []);
  const { rows, addRow, handleInputChange } = useTableRows<TrainingTrackerRow>(
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
    { label: "Date of Training" }, { label: "Agenda" }, { label: "Training Name" }, { label: "Trainer Name" }, { label: "Trainer Emp ID" }, { label: "Attendees" }, { label: "Remarks" },
  ];

  const renderCell = (row: TrainingTrackerRow, key: keyof TrainingTrackerRow) => (
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
      renderCell={(row, key) => renderCell(row, key as keyof TrainingTrackerRow)}
      onAddRow={addRow}
      onSave={() => handleSaveOrSubmit("DRAFT")}
      onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
      isPending={isPending}
    />
  );
};
