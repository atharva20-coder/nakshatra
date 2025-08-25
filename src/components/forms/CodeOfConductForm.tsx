"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveCodeOfConductAction, deleteCodeOfConductAction } from "@/actions/code-of-conduct.action"; 
import { cn } from "@/lib/utils";
import { CodeOfConductRow, FORM_CONFIGS } from "@/types/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      date: now.toISOString().split('T')[0],
    };
  };

export const CodeOfConductForm = ({ initialData }: CodeOfConductFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState<null | number | string>(null);
  const metadata = FORM_CONFIGS.codeOfConduct;
  const { rows, addRow, handleInputChange, setRows } = useTableRows<CodeOfConductRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );

  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    setIsPending(true);
    // Since this is a single-entry form for now, we'll just save the first row.
    const rowToSubmit = rows[0];
    const { ...rest } = rowToSubmit;
    const result = await saveCodeOfConductAction(rest, status, initialData?.id);
    setIsPending(false);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      router.push("/dashboard");
      router.refresh();
    }
  };
    const handleDelete = async (id: string | number) => {
        if (typeof id !== 'string') {
            const updatedRows = rows.filter(row => row.id !== id);
            setRows(updatedRows);
            return;
        }

        setIsPending(true);
        const result = await deleteCodeOfConductAction(id);
        setIsPending(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Row deleted successfully!`);
            const updatedRows = rows.filter(row => row.id !== id);
            setRows(updatedRows);
        }
    };


  const headers = [
    { label: "Name (Proprietor/Partner/Director)" },
    { label: "Signature" },
    { label: "Date" },
    { label: "Actions", className: "text-right" },
  ];
    const filteredRows = useMemo(() => {
        if (selectedMonth === 'all') return rows;
        return rows.filter(row => {
            const rowMonth = new Date(row.date).getMonth() + 1;
            return rowMonth === parseInt(selectedMonth);
        });
    }, [rows, selectedMonth]);

    const isSubmitted = initialData?.status === 'SUBMITTED';

  const renderCell = (row: CodeOfConductRow, key: keyof CodeOfConductRow) => {
    const isEditingRow = isEditing === row.id;

    if (key === 'id') return null;
    
    if (key === 'date') {
      return (
        <Input
          type='date'
          value={row.date}
          onChange={(e) => handleInputChange(row.id, key, e.target.value)}
          className={cn("w-full min-w-[180px]")}
          disabled={isPending || isSubmitted || !isEditingRow}
        />
      );
    }
    
    return (
      <Input
        type='text'
        value={row[key]}
        onChange={(e) => handleInputChange(row.id, key, e.target.value)}
        className={cn("w-full min-w-[180px]")}
        disabled={isPending || isSubmitted || !isEditingRow}
      />
    );
  };
    const renderActions = (row: CodeOfConductRow) => {
        const isEditingRow = isEditing === row.id;
        if (isSubmitted) return null;
        return (
            <div className="flex justify-end gap-2">
                {isEditingRow ? (
                    <Button size="sm" onClick={() => setIsEditing(null)}>Save</Button>
                ) : (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(row.id)}>Edit</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleDelete(row.id)}>Delete</Button>
            </div>
        )
    };

  return (
      <div>
        <div className="mb-4">
            <Select onValueChange={setSelectedMonth} defaultValue="all">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {[...Array(12)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <TableForm
            title={metadata.title}
            headers={headers}
            rows={filteredRows}
            renderCell={(row, key) => renderCell(row as CodeOfConductRow, key as keyof CodeOfConductRow)}
            renderActions={renderActions}
            onAddRow={addRow}
            onSave={() => handleSaveOrSubmit("DRAFT")}
            onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
            isPending={isPending}
            isSubmitted={isSubmitted}
        />
      </div>
  );
};