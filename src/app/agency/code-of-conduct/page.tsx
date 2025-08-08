// src/app/agency/code-of-conduct/page.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState } from "react";
import { TableForm } from "@/components/table-form";
import { getCodeOfConductColumns } from "@/lib/table-definitions";

// Interface for the table row data, including optional dbId
export interface CodeOfConductTableRow {
  id: number; // Local UI id
  dbId?: string; // Database id
  name: string;
  signature: string;
  date: string;
}

// Factory function for creating a new row
const createNewCodeOfConductRow = (id: number): CodeOfConductTableRow => {
  return {
    id,
    name: "",
    signature: "",
    date: new Date().toISOString().split("T")[0],
  };
};

export default function CodeOfConductPage() {
  const { rows, addRow, handleInputChange, saveRow, isLoading } = useTableRows(
    "codeOfConduct",
    createNewCodeOfConductRow
  );
  const [isPending, setIsPending] = useState(false);
  const columns = getCodeOfConductColumns();

  const handleSaveAll = async () => {
    setIsPending(true);
    // Use Promise.all to save all new rows concurrently
    await Promise.all(
      rows.map((row) => {
        // Only save rows that haven't been saved yet (don't have a dbId)
        if (!row.dbId) {
          return saveRow(row);
        }
        return Promise.resolve();
      })
    );
    setIsPending(false);
  };

  const renderCell = (
    row: CodeOfConductTableRow,
    key: keyof CodeOfConductTableRow
  ) => {
    const column = columns.find((c) => c.key === key);
    if (!column) return null;

    return (
      <Input
        type={column.type}
        value={row[key as keyof CodeOfConductTableRow] as string}
        onChange={(e) =>
          handleInputChange(
            row.id,
            key as keyof Omit<CodeOfConductTableRow, "id" | "dbId">,
            e.target.value
          )
        }
        disabled={isPending || isLoading}
        required
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/agency" returnLabel="Back to Agency Dashboard" />

      <main className="p-8">
        <div className="container mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Code of Conduct
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">Loading data...</div>
            ) : (
              <TableForm
                headers={columns}
                rows={rows}
                renderCell={renderCell}
                onAddRow={addRow}
                onSave={handleSaveAll}
                onSubmit={() => {}} // Can be implemented later if needed
                isPending={isPending}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}