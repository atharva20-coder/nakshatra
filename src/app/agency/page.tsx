"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Still used in the header
import { useTableRows } from "@/hooks/use-table-rows";
import { PlusCircle } from "lucide-react";
import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

// Interface for the table row data
export interface AgencyTableRow {
  id: number;
  srNo: string;
  dateOfVisit: string;
  employeeId: string;
  employeeName: string;
  mobileNo: string;
  branchLocation: string;
  product: string;
  bucketDpd: string;
  timeIn: string;
  timeOut: string;
  signature: string;
  purposeOfVisit: string;
}

// Factory function for creating a new row
const createNewAgencyRow = (id: number): AgencyTableRow => ({
  id,
  srNo: String(id),
  dateOfVisit: "",
  employeeId: "",
  employeeName: "",
  mobileNo: "",
  branchLocation: "",
  product: "",
  bucketDpd: "",
  timeIn: "",
  timeOut: "",
  signature: "",
  purposeOfVisit: "",
});

// Auto-Sizing Textarea Component
const AutoSizingTextarea = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Temporarily shrink to get the correct scrollHeight
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.value]); // Rerun this effect when the value changes

  return (
    <textarea
      ref={textareaRef}
      {...props}
      rows={1} // Start with a single row
      className={cn(
        "flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden",
        props.className
      )}
    />
  );
};

export default function AgencyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/profile" returnLabel="Back to Profile" />

      {/* Main Content */}
      <main className="p-8">
        <div className="container mx-auto">
          {/* Centered Headings */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Bank Manager Agency Visit Register
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Agency Visit Details
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <PostsTable />
          </div>
        </div>
      </main>
    </div>
  );
}

const PostsTable = () => {
  const { rows, addRow, handleInputChange } = useTableRows(
    5,
    createNewAgencyRow
  );

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    cellIndex: number
  ) => {
    if (
      e.key === "Tab" &&
      !e.shiftKey &&
      rowIndex === rows.length - 1 &&
      cellIndex === 11 // Last cell
    ) {
      e.preventDefault();
      addRow();
      setTimeout(() => {
        const nextInput = document.querySelector<HTMLTextAreaElement>(
          `[data-row-index="${rowIndex + 1}"][data-cell-index="1"]`
        );
        nextInput?.focus();
      }, 0);
    }
  };

  const headers = [
    "Sr. No",
    "Date of Visit",
    "Employee ID",
    "Employee name",
    "Mobile No.",
    "Branch Location",
    "Product",
    "Bucket/DPD",
    "Time In",
    "Time Out",
    "Signature",
    "Purpose of Visit",
  ];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-rose-800">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                >
                  {header}
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
                      <AutoSizingTextarea
                        value={row[key as keyof Omit<AgencyTableRow, "id">]}
                        onChange={(e) =>
                          handleInputChange(
                            row.id,
                            key as keyof Omit<AgencyTableRow, "id">,
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, cellIndex)}
                        data-row-index={rowIndex}
                        data-cell-index={cellIndex}
                        readOnly={key === "srNo"}
                      />
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
        <Button onClick={addRow} variant="outline">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Row
        </Button>
        <Button variant="secondary">Save</Button>
        <Button className="bg-rose-800 hover:bg-rose-900 text-white">
          Submit
        </Button>
      </div>
    </div>
  );
};