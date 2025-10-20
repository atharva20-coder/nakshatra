"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2 } from 'lucide-react';
import { TelephoneDeclarationRow, FORM_CONFIGS } from "@/types/forms";
import { saveTelephoneDeclarationAction, deleteTelephoneDeclarationAction } from '@/actions/telephone-declaration.action';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TelephoneDeclarationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: TelephoneDeclarationRow[];
  } | null;
}

const createNewRow = (id: number): TelephoneDeclarationRow => ({
  id,
  srNo: String(id),
  telephoneNo: "",
  username: "",
  executiveCategory: "",
  recordingLine: "No",
  remarks: "",
});

export const TelephoneDeclarationForm = ({ initialData }: TelephoneDeclarationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const metadata = FORM_CONFIGS.telephoneDeclaration;

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<TelephoneDeclarationRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  useEffect(() => {
    setIsSubmitted(initialData?.status === "SUBMITTED");
  }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (rows.length === 0) {
      toast.error("Please add at least one telephone line entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.telephoneNo || !row.username || !row.executiveCategory || !row.recordingLine
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each entry.");
      return;
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveTelephoneDeclarationAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        router.push("/user/dashboard");
      } else if (result.formId) {
        router.push(`/user/forms/telephoneDeclaration/${result.formId}`);
      }
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) {
      toast.error("Form ID not found.");
      return;
    }
    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const result = await deleteTelephoneDeclarationAction(initialData.id);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Form successfully deleted!");
      router.push("/user/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {isSubmitted && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-lg p-4 text-center font-medium">
          <p>This form has been submitted and cannot be edited.</p>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
        {initialData?.id && !isSubmitted && (
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash className="h-4 w-4 mr-2" />
            Delete Draft
          </Button>
        )}
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
        <p>
          Declaration of all telephone lines used for collection activities. All lines must be properly recorded and monitored as per RBI guidelines and bank policies.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Telephone Line Details</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Line
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <tr>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Sr. No</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Telephone No</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Username</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Executive Category</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Recording Line</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Remarks</th>
                <th className="p-3 text-center text-sm font-medium whitespace-nowrap w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No telephone lines added yet. Click &quot;Add Line&quot; to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3">
                      <Input
                        value={row.srNo}
                        onChange={(e) => handleInputChange(row.id, "srNo", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder={String(index + 1)}
                        className="w-20"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.telephoneNo}
                        onChange={(e) => handleInputChange(row.id, "telephoneNo", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="+91-XXX-XXX-XXXX"
                        className="min-w-[160px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.username}
                        onChange={(e) => handleInputChange(row.id, "username", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Username"
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.executiveCategory}
                        onChange={(e) => handleInputChange(row.id, "executiveCategory", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Category"
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-3">
                      <Select
                        value={row.recordingLine}
                        onValueChange={(value) => handleInputChange(row.id, "recordingLine", value)}
                        disabled={isSubmitted || isPending}
                      >
                        <SelectTrigger className="min-w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.remarks}
                        onChange={(e) => handleInputChange(row.id, "remarks", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Optional remarks"
                        className="min-w-[160px]"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={isSubmitted || isPending || rows.length <= 1}
                        title={rows.length <= 1 ? "At least one line is required" : "Remove line"}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isSubmitted && (
        <div className="flex justify-end space-x-4 pt-4">
          <Button 
            variant="outline" 
            onClick={() => handleSaveOrSubmit("DRAFT")} 
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSaveOrSubmit("SUBMITTED")} 
            disabled={isPending}
            className="bg-rose-800 hover:bg-rose-900 text-white"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit for Approval
          </Button>
        </div>
      )}
    </div>
  );
};