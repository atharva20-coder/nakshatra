"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import { saveCodeOfConductAction, deleteCodeOfConductAction } from "@/actions/code-of-conduct.action";
import { cn } from "@/lib/utils";
import { CodeOfConductRow, FORM_CONFIGS } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
    date: now.toISOString().split('T')[0], // Format as YYYY-MM-DD
  };
};

export const CodeOfConductForm = ({ initialData }: CodeOfConductFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const metadata = FORM_CONFIGS.codeOfConduct;

  const { rows, addRow, removeRow, handleInputChange } = useTableRows<CodeOfConductRow>(
    initialData?.details ?? [createNewRow(1)],
    createNewRow
  );

  // Set initial states based on data
  useEffect(() => {
    if (initialData) {
      if (initialData.status === 'SUBMITTED') {
        setIsSubmitted(true);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [initialData]);

  const handleDelete = async () => {
    if (!initialData?.id || isSubmitted) return;

    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteCodeOfConductAction(initialData.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Form deleted successfully");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("An unexpected error occurred while deleting the form.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    // Validate required fields
    const hasEmptyFields = rows.some(row => 
      !row.name.trim() || !row.signature.trim() || !row.date.trim()
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (rows.length === 0) {
      toast.error("Please add at least one row.");
      return;
    }

    setIsPending(true);

    try {
      // Convert rows to the format expected by the action
      const rowsData = rows.map(({ id, ...row }) => row);
      
      const result = await saveCodeOfConductAction(
        rowsData, 
        status, 
        initialData?.id
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`
        );
        
        if (status === "SUBMITTED") {
          setIsSubmitted(true);
          router.push("/dashboard");
        } else if (result.formId) {
          // Always redirect to the form's specific page after saving
          router.push(`/forms/codeOfConduct/${result.formId}`);
        }
        
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving form:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const headers = [
    { label: "Name (Proprietor/Partner/Director)", required: true },
    { label: "Signature", required: true },
    { label: "Date", required: true },
    { label: "Actions", required: false },
  ];

  const renderCell = (row: CodeOfConductRow, key: keyof CodeOfConductRow | 'actions') => {
    const isDisabled = isPending || (initialData?.status === 'SUBMITTED');
    
    if (key === 'actions') {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeRow(row.id)}
          disabled={isDisabled || rows.length <= 1 || initialData?.status === 'SUBMITTED'}
          className={cn("hover:text-red-500", {
            "opacity-50 cursor-not-allowed": isDisabled || rows.length <= 1
          })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <Input
        type={key === 'date' ? 'date' : 'text'}
        value={row[key] || ''}
        onChange={(e) => handleInputChange(row.id, key, e.target.value)}
        className={cn("w-full min-w-[180px]", {
          "opacity-50 cursor-not-allowed": isDisabled
        })}
        disabled={isDisabled}
        placeholder={
          key === 'name' ? 'Enter full name' :
          key === 'signature' ? 'Enter signature' :
          key === 'date' ? 'Select date' : ''
        }
        required
      />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            📋 This form has been submitted and cannot be edited.
          </p>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{metadata.title}</h2>
        {initialData?.id && !isSubmitted && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isPending}
          >
            {isDeleting ? "Deleting..." : "Delete Form"}
          </Button>
        )}
      </div>

      <p className="text-gray-600">{metadata.description}</p>
      
      <TableForm

        headers={headers}
        rows={rows}
        renderCell={(row, key) => renderCell(row as CodeOfConductRow, key as keyof CodeOfConductRow | 'actions')}
        onAddRow={isSubmitted ? undefined : addRow}
        onSave={isSubmitted ? undefined : () => handleSaveOrSubmit("DRAFT")}
        onSubmit={isSubmitted ? undefined : () => handleSaveOrSubmit("SUBMITTED")}
        isPending={isPending}
        showActions={!isSubmitted}
      />
    </div>
  );
};