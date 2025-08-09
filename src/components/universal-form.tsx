/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/universal-form.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Input } from "@/components/ui/input";
import { useTableRows } from "@/hooks/use-table-rows";
import React, { useState, useEffect } from "react";
import { saveFormAction, getFormDataAction } from "@/actions/form-management.action";
import { toast } from "sonner";
import { ApprovalButton } from "@/components/approval-button";
import { TableForm } from "@/components/table-forms";
import { cn } from "@/lib/utils";
import { FORM_CONFIGS, canEditForm, isFormOverdue } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertTriangle } from "lucide-react";

interface UniversalFormProps<T extends { id: number }> {
  formType: string;
  rowFactory: (id: number) => T;
  headers: { label: string; className?: string }[];
  renderCell: (row: T, key: keyof T, rowIndex: number, cellIndex: number, isPending: boolean, updateRowValue: any) => React.ReactNode;
  validateRow?: (row: T) => string | null;
  requiresApproval?: boolean;
}

export function UniversalForm<T extends { id: number }>({
  formType,
  rowFactory,
  headers,
  renderCell,
  validateRow,
  requiresApproval = false
}: UniversalFormProps<T>) {
  const { rows, addRow, handleInputChange, updateRowValue } = useTableRows("1", rowFactory);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('DRAFT');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const formConfig = FORM_CONFIGS[formType];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isOverdue = isFormOverdue(currentMonth, currentYear, formConfig?.deadlineDay || 5);
  const canEdit = canEditForm(formStatus, currentMonth, currentYear, formConfig?.deadlineDay || 5);

  // Load existing form data on component mount
  useEffect(() => {
    const loadFormData = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, you'd get the current user's ID
        const userId = "current-user-id"; // This should come from session
        const result = await getFormDataAction(formType, userId);
        
        if (result.success && result.data && result.data.length > 0) {
          const latestForm = result.data[0];
          setFormStatus(latestForm.status);
          setLastSaved(new Date(latestForm.updatedAt));
          
          // Load the form data into rows - this would need to be customized per form type
          // For now, keeping existing rows
        }
      } catch (err) {
        console.error("Error loading form data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormData();
  }, [formType]);

  const handleApprovalSuccess = (rowId: number) => {
    const now = new Date();
    updateRowValue(rowId, "timeOut" as Exclude<keyof T, "id" | "dbId">, now.toLocaleTimeString());
    updateRowValue(rowId, "signature" as Exclude<keyof T, "id" | "dbId">, "Approved by Bank Manager");
  };

  const validateRows = (isSubmitting: boolean) => {
    if (!validateRow) return true;

    for (const row of rows) {
      const error = validateRow(row);
      if (error) {
        toast.error(error);
        return false;
      }
      
      if (isSubmitting && requiresApproval) {
        // Check if all required approvals are in place
        const signatureKey = Object.keys(row).find(key => key.toLowerCase().includes('signature'));
        if (signatureKey && !row[signatureKey as keyof T]) {
          toast.error(`Row ${row.id} must be approved before submitting.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    const isSubmitting = status === "SUBMITTED";
    
    if (!canEdit && status === "DRAFT") {
      toast.error("Form cannot be edited. Please request approval for changes.");
      return;
    }

    if (isOverdue && status === "DRAFT") {
      toast.error("Deadline has passed. Form will be auto-submitted.");
      return;
    }

    if (!validateRows(isSubmitting)) {
      return;
    }

    setIsPending(true);
    const rowsToSave = rows.map(({ id, ...rest }) => rest);
    
    const result = await saveFormAction(formType, rowsToSave, status);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(
        `${formConfig?.title || 'Form'} successfully ${status === "DRAFT" ? "saved" : "submitted"}!`
      );
      setFormStatus(status);
      setLastSaved(new Date());
    }

    setIsPending(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    cellIndex: number
  ) => {
    if (
      e.key === "Tab" &&
      !e.shiftKey &&
      rowIndex === rows.length - 1 &&
      cellIndex === headers.length - 1
    ) {
      e.preventDefault();
      addRow();
      setTimeout(() => {
        const nextInput = document.querySelector<HTMLInputElement>(
          `[data-row-index="${rowIndex + 1}"][data-cell-index="1"]`
        );
        nextInput?.focus();
      }, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p>Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/dashboard" returnLabel="Back to Dashboard" />

      <main className="p-8">
        <div className="container mx-auto">
          {/* Form Header with Status */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {formConfig?.title || 'Form'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {formConfig?.description || 'Form submission'}
            </p>
            
            {/* Status indicators */}
            <div className="flex justify-center items-center gap-4 mt-4">
              <div className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                formStatus === 'DRAFT' && "bg-yellow-100 text-yellow-800",
                formStatus === 'SUBMITTED' && "bg-blue-100 text-blue-800",
                formStatus === 'APPROVED' && "bg-green-100 text-green-800",
                formStatus === 'REJECTED' && "bg-red-100 text-red-800"
              )}>
                Status: {formStatus}
              </div>
              
              {lastSaved && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Last saved: {lastSaved.toLocaleString()}
                </div>
              )}
              
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                Deadline: {formConfig?.deadlineDay || 5}th of each month
              </div>
              
              {isOverdue && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue - Will be auto-submitted
                </div>
              )}
            </div>
          </div>

          {/* Form submission restrictions */}
          {!canEdit && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Form Editing Restricted</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                This form has been submitted or the deadline has passed. To make changes, please submit an approval request.
              </p>
              <Button 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  // Navigate to approval request page
                  window.location.href = `/approval-request?formType=${formType}&formId=current`;
                }}
              >
                Request Approval for Changes
              </Button>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <TableForm
              headers={headers}
              rows={rows}
              renderCell={(row, key, rowIndex, cellIndex) => 
                renderCell(row, key, rowIndex, cellIndex, isPending, updateRowValue)
              }
              onAddRow={addRow}
              onSave={() => handleSaveOrSubmit("DRAFT")}
              onSubmit={() => handleSaveOrSubmit("SUBMITTED")}
              isPending={isPending}
              
              
            />
          </div>
          
          {/* Auto-save indicator */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>✅ Changes are automatically saved as you type</p>
          </div>
        </div>
      </main>
    </div>
  );
}