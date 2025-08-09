// src/app/agency/declaration-of-product/page.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState } from "react";
import { TableForm } from "@/components/table-forms";
import { getDeclarationOfProductColumns } from "@/lib/table-definitions";

export interface DeclarationOfProductTableRow {
  id: number;
  dbId?: string;
  product: string;
  busket: string;
  countOfCaseAllocated: string;
  collectionManagerName: string;
  collectionManagerLocation: string;
  cmSign: string;
}

const createNewRow = (id: number): DeclarationOfProductTableRow => ({
  id,
  product: "",
  busket: "",
  countOfCaseAllocated: "",
  collectionManagerName: "",
  collectionManagerLocation: "",
  cmSign: "",
});

export default function DeclarationOfProductPage() {
  const { rows, addRow, handleInputChange, saveRow, isLoading } = useTableRows(
    "declarationOfProduct",
    createNewRow
  );
  const [isPending, setIsPending] = useState(false);
  const columns = getDeclarationOfProductColumns();

  const handleSaveAll = async () => {
    setIsPending(true);
    await Promise.all(
      rows.map((row) => !row.dbId && saveRow(row))
    );
    setIsPending(false);
  };

  const renderCell = (row: DeclarationOfProductTableRow, key: keyof DeclarationOfProductTableRow) => {
    const column = columns.find((c) => c.key === key);
    if (!column) return null;

    return (
      <Input
        type={column.type}
        value={row[key] as string}
        onChange={(e) => handleInputChange(row.id, key as keyof Omit<DeclarationOfProductTableRow, "id" | "dbId">, e.target.value)}
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
          <h2 className="text-2xl font-bold text-center mb-6">Declaration Of Product</h2>
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