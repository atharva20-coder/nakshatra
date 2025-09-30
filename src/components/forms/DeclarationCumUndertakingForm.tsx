"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2 } from 'lucide-react';
import { DeclarationCumUndertakingRow, FORM_CONFIGS } from "@/types/forms";
import { saveDeclarationCumUndertakingAction, deleteDeclarationCumUndertakingAction } from '@/actions/declaration-cum-undertaking.action';

interface DeclarationCumUndertakingFormProps {
  initialData?: {
    id: string;
    status: string;
    details: DeclarationCumUndertakingRow[];
  } | null;
}

const createNewRow = (id: number): DeclarationCumUndertakingRow => ({
  id,
  collectionManagerName: "",
  collectionManagerEmployeeId: "",
  collectionManagerSignature: "",
});

export const DeclarationCumUndertakingForm = ({ initialData }: DeclarationCumUndertakingFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const metadata = FORM_CONFIGS.declarationCumUndertaking;

  // Initialize rows from initial data or create a new row
  const { rows, addRow, handleInputChange, removeRow } = useTableRows<DeclarationCumUndertakingRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  // Set submission status from initial data
  useEffect(() => {
    setIsSubmitted(initialData?.status === "SUBMITTED");
  }, [initialData]);

  // Handle both saving as a draft and submitting the form
  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    // Validate that at least one manager is added
    if (rows.length === 0) {
      toast.error("Please add at least one collection manager.");
      return;
    }

    // Validate required fields
    const hasEmptyFields = rows.some(
      row => !row.collectionManagerName || !row.collectionManagerEmployeeId || !row.collectionManagerSignature
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each collection manager.");
      return;
    }

    setIsPending(true);
    // Remove the temporary client-side ID before sending to the server
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveDeclarationCumUndertakingAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        router.push("/dashboard");
      } else if (result.formId) {
        // If it's a new draft, redirect to the new URL with the form ID
        router.push(`/forms/declarationCumUndertaking/${result.formId}`);
      }
      router.refresh();
    }
  };

  // Handle the deletion of a draft
  const handleDelete = async () => {
    if (!initialData?.id) {
      toast.error("Form ID not found.");
      return;
    }
    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const result = await deleteDeclarationCumUndertakingAction(initialData.id);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Form successfully deleted!");
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Submission status banner */}
      {isSubmitted && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-lg p-4 text-center font-medium">
          <p>This form has been submitted and cannot be edited.</p>
        </div>
      )}

      {/* Header section */}
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

      {/* Declaration text */}
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
        <p>
          I/We, the undersigned, on behalf of our agency, hereby declare and undertake that all collection activities for Axis Bank will be conducted in strict adherence to the bank&apos;s code of conduct and all applicable laws and regulations.
        </p>
        <p>
          We confirm that all collection managers listed below are our employees, have been adequately trained on fair practices, and are authorized to carry out collection activities on behalf of Axis Bank. We take full responsibility for their actions and will ensure their compliance with all guidelines.
        </p>
      </div>

      {/* Collection Managers Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Authorized Collection Managers</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Manager
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
          {/* Table Header */}
          <div className="grid grid-cols-[3fr_2fr_2fr_auto] items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 font-medium text-sm border-b">
            <span>Collection Manager Name</span>
            <span>Employee ID</span>
            <span>Signature</span>
            <span className="w-10"></span>
          </div>
          
          {/* Table Rows */}
          {rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No collection managers added yet. Click &quot;Add Manager&quot; to get started.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[3fr_2fr_2fr_auto] items-center gap-4 p-3 border-b last:border-b-0">
                <Input
                  value={row.collectionManagerName}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerName", e.target.value)}
                  disabled={isSubmitted || isPending}
                  placeholder="Enter manager's full name"
                  className="bg-white dark:bg-gray-900"
                />
                <Input
                  value={row.collectionManagerEmployeeId}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerEmployeeId", e.target.value)}
                  disabled={isSubmitted || isPending}
                  placeholder="Employee ID"
                  className="bg-white dark:bg-gray-900"
                />
                <Input
                  value={row.collectionManagerSignature}
                  onChange={(e) => handleInputChange(row.id, "collectionManagerSignature", e.target.value)}
                  disabled={isSubmitted || isPending}
                  placeholder="Signature"
                  className="bg-white dark:bg-gray-900"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row.id)}
                  disabled={isSubmitted || isPending || rows.length <= 1}
                  title={rows.length <= 1 ? "At least one manager is required" : "Remove manager"}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action buttons */}
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