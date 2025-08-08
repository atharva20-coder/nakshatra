// src/app/agency/telephone-lines-declaration/page.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState } from "react";
import { TableForm } from "@/components/table-form";
import { getTelephoneLinesDeclarationColumns } from "@/lib/table-definitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TelephoneLinesDeclarationTableRow {
  id: number;
  dbId?: string;
  srNo: string;
  telephoneNo: string;
  username: string;
  executiveCategory: string;
  recordingLine: string;
  remarks: string;
}

const createNewRow = (id: number): TelephoneLinesDeclarationTableRow => ({
  id,
  srNo: String(id),
  telephoneNo: "",
  username: "",
  executiveCategory: "",
  recordingLine: "Yes",
  remarks: "",
});

export default function TelephoneLinesDeclarationPage() {
  const { rows, addRow, handleInputChange, saveRow, isLoading } = useTableRows(
    "telephoneLinesDeclaration",
    createNewRow
  );
  const [isPending, setIsPending] = useState(false);
  const columns = getTelephoneLinesDeclarationColumns();

  const handleSaveAll = async () => {
    setIsPending(true);
    await Promise.all(
      rows.map((row) => !row.dbId && saveRow(row))
    );
    setIsPending(false);
  };

  const renderCell = (row: TelephoneLinesDeclarationTableRow, key: keyof TelephoneLinesDeclarationTableRow) => {
    const column = columns.find((c) => c.key === key);
    if (!column) return null;

     if (column.type === 'select' && column.options) {
      return (
        <Select
          value={row[key] as string}
          onValueChange={(value) => handleInputChange(row.id, key as keyof Omit<TelephoneLinesDeclarationTableRow, "id" | "dbId">, value)}
          disabled={isPending || isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${column.label}`} />
          </SelectTrigger>
          <SelectContent>
            {column.options.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={column.type}
        value={row[key] as string}
        onChange={(e) => handleInputChange(row.id, key as keyof Omit<TelephoneLinesDeclarationTableRow, "id" | "dbId">, e.target.value)}
        disabled={isPending || isLoading || key === 'srNo'}
        required
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader returnHref="/agency" returnLabel="Back to Agency Dashboard" />
      <main className="p-8">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Telephone Lines Declaration</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : (
              <TableForm
                headers={columns}
                rows={rows}
                renderCell={renderCell}
                onAddRow={addRow}
                onSave={handleSaveAll}
                onSubmit={() => {}}
                isPending={isPending}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
