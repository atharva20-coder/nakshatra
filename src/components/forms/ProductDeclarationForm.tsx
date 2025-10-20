"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2 } from 'lucide-react';
import { ProductDeclarationRow, FORM_CONFIGS } from "@/types/forms";
import { saveProductDeclarationAction, deleteProductDeclarationAction } from '@/actions/product-declaration.action';

interface ProductDeclarationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: ProductDeclarationRow[];
  } | null;
}

const createNewRow = (id: number): ProductDeclarationRow => ({
  id,
  product: "",
  bucket: "",
  countOfCaseAllocated: "0",
  collectionManagerName: "",
  collectionManagerLocation: "",
  cmSign: "",
});

export const ProductDeclarationForm = ({ initialData }: ProductDeclarationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const metadata = FORM_CONFIGS.productDeclaration;

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<ProductDeclarationRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  useEffect(() => {
    setIsSubmitted(initialData?.status === "SUBMITTED");
  }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (rows.length === 0) {
      toast.error("Please add at least one product entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.product || !row.bucket || !row.countOfCaseAllocated || 
             !row.collectionManagerName || !row.collectionManagerLocation || !row.cmSign
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each entry.");
      return;
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveProductDeclarationAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        router.push("/user/dashboard");
      } else if (result.formId) {
        router.push(`/user/forms/productDeclaration/${result.formId}`);
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
    const result = await deleteProductDeclarationAction(initialData.id);
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
    <div className="space-y-6 max-w-6xl mx-auto">
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
          Declaration of products allocated to the agency for collection activities. This includes the bucket-wise distribution and assigned collection managers for each product category.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Product Allocation Details</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Product
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <tr>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Product</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Bucket</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Count of Cases Allocated</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">Collection Manager Name</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">CM Location</th>
                <th className="p-3 text-left text-sm font-medium whitespace-nowrap">CM Signature</th>
                <th className="p-3 text-center text-sm font-medium whitespace-nowrap w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No products added yet. Click &quot;Add Product&quot; to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3">
                      <Input
                        value={row.product}
                        onChange={(e) => handleInputChange(row.id, "product", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Product name"
                        className="min-w-[160px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.bucket}
                        onChange={(e) => handleInputChange(row.id, "bucket", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Bucket (e.g., X, X+)"
                        className="min-w-[120px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={row.countOfCaseAllocated}
                        onChange={(e) => handleInputChange(row.id, "countOfCaseAllocated", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="0"
                        min="0"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.collectionManagerName}
                        onChange={(e) => handleInputChange(row.id, "collectionManagerName", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Manager name"
                        className="min-w-[180px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.collectionManagerLocation}
                        onChange={(e) => handleInputChange(row.id, "collectionManagerLocation", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Location"
                        className="min-w-[160px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.cmSign}
                        onChange={(e) => handleInputChange(row.id, "cmSign", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Signature"
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={isSubmitted || isPending || rows.length <= 1}
                        title={rows.length <= 1 ? "At least one product is required" : "Remove product"}
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
          <Button variant="outline" onClick={() => handleSaveOrSubmit("DRAFT")} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSaveOrSubmit("SUBMITTED")} disabled={isPending} className="bg-rose-800 hover:bg-rose-900 text-white">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit for Approval
          </Button>
        </div>
      )}
    </div>
  );
};