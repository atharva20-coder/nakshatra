"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2 } from 'lucide-react';
import { ProactiveEscalationRow, FORM_CONFIGS } from "@/types/forms";
import { saveProactiveEscalationAction, deleteProactiveEscalationAction } from '@/actions/proactive-escalation.action';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProactiveEscalationFormProps {
  initialData?: {
    id: string;
    status: string;
    details: ProactiveEscalationRow[];
  } | null;
}

const createNewRow = (id: number): ProactiveEscalationRow => ({
  id,
  lanCardNo: "",
  customerName: "",
  product: "",
  currentBucket: "",
  dateOfContact: new Date().toISOString().split('T')[0],
  modeOfContact: "Call",
  dateOfTrailUploaded: "",
  listOfCaseWithReasons: "",
  collectionManagerNameId: "",
});

export const ProactiveEscalationForm = ({ initialData }: ProactiveEscalationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const metadata = FORM_CONFIGS.proactiveEscalation;

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<ProactiveEscalationRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  useEffect(() => {
    setIsSubmitted(initialData?.status === "SUBMITTED");
  }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (rows.length === 0) {
      toast.error("Please add at least one escalation entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.lanCardNo || !row.customerName || !row.product || !row.currentBucket || 
             !row.dateOfContact || !row.modeOfContact || !row.listOfCaseWithReasons || !row.collectionManagerNameId
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each entry.");
      return;
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveProactiveEscalationAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        router.push("/user/dashboard");
      } else if (result.formId) {
        router.push(`/user/forms/proactiveEscalation/${result.formId}`);
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
    const result = await deleteProactiveEscalationAction(initialData.id);
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
    <div className="space-y-6 max-w-[1800px] mx-auto">
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
          Track proactive escalations for high-risk cases. This form records all customer contacts where potential issues are identified and escalated before they become critical problems.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Escalation Records</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Escalation
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <tr>
                <th className="p-3 text-left font-medium whitespace-nowrap">LAN/Card No</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Customer Name</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Product</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Current Bucket</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Date of Contact</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Mode of Contact</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Date Trail Uploaded</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">Case Reasons</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">CM Name/ID</th>
                <th className="p-3 text-center font-medium whitespace-nowrap w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    No escalations added yet. Click &quot;Add Escalation&quot; to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3">
                      <Input
                        value={row.lanCardNo}
                        onChange={(e) => handleInputChange(row.id, "lanCardNo", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="LAN/Card No"
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.customerName}
                        onChange={(e) => handleInputChange(row.id, "customerName", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Customer name"
                        className="min-w-[160px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.product}
                        onChange={(e) => handleInputChange(row.id, "product", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Product"
                        className="min-w-[120px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.currentBucket}
                        onChange={(e) => handleInputChange(row.id, "currentBucket", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="Bucket"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="date"
                        value={row.dateOfContact}
                        onChange={(e) => handleInputChange(row.id, "dateOfContact", e.target.value)}
                        disabled={isSubmitted || isPending}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-3">
                      <Select
                        value={row.modeOfContact}
                        onValueChange={(value) => handleInputChange(row.id, "modeOfContact", value)}
                        disabled={isSubmitted || isPending}
                      >
                        <SelectTrigger className="min-w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Call">Call</SelectItem>
                          <SelectItem value="Field Visit">Field Visit</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Input
                        type="date"
                        value={row.dateOfTrailUploaded}
                        onChange={(e) => handleInputChange(row.id, "dateOfTrailUploaded", e.target.value)}
                        disabled={isSubmitted || isPending}
                        className="min-w-[140px]"
                        placeholder="Optional"
                      />
                    </td>
                    <td className="p-3">
                      <Textarea
                        value={row.listOfCaseWithReasons}
                        onChange={(e) => handleInputChange(row.id, "listOfCaseWithReasons", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="List reasons for escalation"
                        className="min-w-[200px] min-h-[60px]"
                        rows={2}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={row.collectionManagerNameId}
                        onChange={(e) => handleInputChange(row.id, "collectionManagerNameId", e.target.value)}
                        disabled={isSubmitted || isPending}
                        placeholder="CM Name/ID"
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={isSubmitted || isPending || rows.length <= 1}
                        title={rows.length <= 1 ? "At least one escalation is required" : "Remove escalation"}
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