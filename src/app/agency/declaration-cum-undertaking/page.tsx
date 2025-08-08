// src/app/agency/declaration-cum-undertaking/page.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState } from "react";
import { TableForm } from "@/components/table-form";
import { getDeclarationCumUndertakingColumns } from "@/lib/table-definitions";

export interface DeclarationCumUndertakingTableRow {
  id: number;
  dbId?: string;
  collectionManagerName: string;
  collectionManagerEmpId: string;
  collectionManagerSign: string;
}

const createNewRow = (id: number): DeclarationCumUndertakingTableRow => ({
  id,
  collectionManagerName: "",
  collectionManagerEmpId: "",
  collectionManagerSign: "",
});

export default function DeclarationCumUndertakingPage() {
  const { rows, addRow, handleInputChange, saveRow, isLoading } = useTableRows(
    "declarationCumUndertaking",
    createNewRow
  );
  const [isPending, setIsPending] = useState(false);
  const columns = getDeclarationCumUndertakingColumns();

  const handleSaveAll = async () => {
    setIsPending(true);
    await Promise.all(
      rows.map((row) => !row.dbId && saveRow(row))
    );
    setIsPending(false);
  };

  const renderCell = (row: DeclarationCumUndertakingTableRow, key: keyof DeclarationCumUndertakingTableRow) => {
    const column = columns.find((c) => c.key === key);
    if (!column) return null;

    return (
      <Input
        type={column.type}
        value={row[key] as string}
        onChange={(e) => handleInputChange(row.id, key as keyof Omit<DeclarationCumUndertakingTableRow, "id" | "dbId">, e.target.value)}
        disabled={isPending || isLoading}
        required
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader returnHref="/agency" returnLabel="Back to Agency Dashboard" />
      <main className="p-8">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Declaration Cum Undertaking</h2>
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