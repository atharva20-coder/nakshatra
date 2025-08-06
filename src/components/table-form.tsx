"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Generic props for the reusable table form
interface TableFormProps<T> {
  headers: { label: string; className?: string }[];
  rows: T[];
  renderCell: (row: T, key: keyof T, rowIndex: number, cellIndex: number) => React.ReactNode;
  onAddRow: () => void;
  onSave: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export const TableForm = <T extends { id: number }>({
  headers,
  rows,
  renderCell,
  onAddRow,
  onSave,
  onSubmit,
  isPending,
}: TableFormProps<T>) => {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="bg-rose-800">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.label}
                  className={cn(
                    "px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider",
                    header.className
                  )}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {Object.keys(row)
                  .filter((key) => key !== "id")
                  .map((key, cellIndex) => (
                    <td key={key} className="px-6 py-4 text-sm align-top">
                      {renderCell(row, key as keyof T, rowIndex, cellIndex)}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
        <Button onClick={onAddRow} variant="outline" disabled={isPending}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Row
        </Button>
        <Button
          variant="secondary"
          onClick={onSave}
          disabled={isPending}
        >
          Save
        </Button>
        <Button
          className="bg-rose-800 hover:bg-rose-900 text-white"
          onClick={onSubmit}
          disabled={isPending}
        >
          Submit
        </Button>
      </div>
    </div>
  );
};
