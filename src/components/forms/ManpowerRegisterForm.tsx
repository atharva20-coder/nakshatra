"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2 } from 'lucide-react';
import { ManpowerRegisterRow, FORM_CONFIGS } from "@/types/forms";
import { saveManpowerRegisterAction, deleteManpowerRegisterAction } from '@/actions/manpower-register.action';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManpowerRegisterFormProps {
  initialData?: {
    id: string;
    status: string;
    details: ManpowerRegisterRow[];
  } | null;
}

const createNewRow = (id: number): ManpowerRegisterRow => ({
  id,
  srNo: String(id),
  executiveCategory: "",
  hhdIdOfFos: "",
  axisIdOfFos: "",
  fosFullName: "",
  dateOfJoining: new Date().toISOString().split('T')[0],
  product: "",
  cocSigned: "No",
  collectionManagerName: "",
  collectionManagerId: "",
  collectionManagerSign: "",
  dateOfResignation: "",
  idCardsIssuanceDate: "",
  idCardReturnDate: "",
  executiveSignature: "",
  remarks: "",
});

export const ManpowerRegisterForm = ({ initialData }: ManpowerRegisterFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const metadata = FORM_CONFIGS.manpowerRegister;

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<ManpowerRegisterRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  useEffect(() => {
    setIsSubmitted(initialData?.status === "SUBMITTED");
  }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (rows.length === 0) {
      toast.error("Please add at least one manpower entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.fosFullName || !row.dateOfJoining || !row.product || !row.executiveCategory || 
             !row.collectionManagerName || !row.collectionManagerId || !row.executiveSignature
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each entry.");
      return;
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await saveManpowerRegisterAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        router.push("/dashboard");
      } else if (result.formId) {
        router.push(`/forms/manpowerRegister/${result.formId}`);
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
    const result = await deleteManpowerRegisterAction(initialData.id);
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
    <div className="space-y-6 max-w-[1600px] mx-auto">
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Employee Records</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Employee
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <tr>
                <th className="p-2 text-left font-medium">Sr No</th>
                <th className="p-2 text-left font-medium">Category</th>
                <th className="p-2 text-left font-medium">HHD ID</th>
                <th className="p-2 text-left font-medium">Axis ID</th>
                <th className="p-2 text-left font-medium">Full Name</th>
                <th className="p-2 text-left font-medium">Joining Date</th>
                <th className="p-2 text-left font-medium">Product</th>
                <th className="p-2 text-left font-medium">COC Signed</th>
                <th className="p-2 text-left font-medium">CM Name</th>
                <th className="p-2 text-left font-medium">CM ID</th>
                <th className="p-2 text-left font-medium">CM Sign</th>
                <th className="p-2 text-left font-medium">Resignation Date</th>
                <th className="p-2 text-left font-medium">ID Issuance</th>
                <th className="p-2 text-left font-medium">ID Return</th>
                <th className="p-2 text-left font-medium">Exec Sign</th>
                <th className="p-2 text-left font-medium">Remarks</th>
                <th className="p-2 text-center font-medium w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-gray-500">
                    No employees added yet. Click &quot;Add Employee&quot; to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="p-2">
                      <Input value={row.srNo} onChange={(e) => handleInputChange(row.id, "srNo", e.target.value)} disabled={isSubmitted || isPending} className="w-16" />
                    </td>
                    <td className="p-2">
                      <Select value={row.executiveCategory} onValueChange={(value) => handleInputChange(row.id, "executiveCategory", value)} disabled={isSubmitted || isPending}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FOS">FOS</SelectItem>
                          <SelectItem value="Tele-caller">Tele-caller</SelectItem>
                          <SelectItem value="Tracer">Tracer</SelectItem>
                          <SelectItem value="Backend">Backend</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input value={row.hhdIdOfFos} onChange={(e) => handleInputChange(row.id, "hhdIdOfFos", e.target.value)} disabled={isSubmitted || isPending} className="w-28" /></td>
                    <td className="p-2"><Input value={row.axisIdOfFos} onChange={(e) => handleInputChange(row.id, "axisIdOfFos", e.target.value)} disabled={isSubmitted || isPending} className="w-28" /></td>
                    <td className="p-2"><Input value={row.fosFullName} onChange={(e) => handleInputChange(row.id, "fosFullName", e.target.value)} disabled={isSubmitted || isPending} className="w-40" /></td>
                    <td className="p-2"><Input type="date" value={row.dateOfJoining} onChange={(e) => handleInputChange(row.id, "dateOfJoining", e.target.value)} disabled={isSubmitted || isPending} className="w-36" /></td>
                    <td className="p-2"><Input value={row.product} onChange={(e) => handleInputChange(row.id, "product", e.target.value)} disabled={isSubmitted || isPending} className="w-32" /></td>
                    <td className="p-2">
                      <Select value={row.cocSigned} onValueChange={(value) => handleInputChange(row.id, "cocSigned", value)} disabled={isSubmitted || isPending}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input value={row.collectionManagerName} onChange={(e) => handleInputChange(row.id, "collectionManagerName", e.target.value)} disabled={isSubmitted || isPending} className="w-32" /></td>
                    <td className="p-2"><Input value={row.collectionManagerId} onChange={(e) => handleInputChange(row.id, "collectionManagerId", e.target.value)} disabled={isSubmitted || isPending} className="w-28" /></td>
                    <td className="p-2"><Input value={row.collectionManagerSign} onChange={(e) => handleInputChange(row.id, "collectionManagerSign", e.target.value)} disabled={isSubmitted || isPending} className="w-28" /></td>
                    <td className="p-2"><Input type="date" value={row.dateOfResignation} onChange={(e) => handleInputChange(row.id, "dateOfResignation", e.target.value)} disabled={isSubmitted || isPending} className="w-36" /></td>
                    <td className="p-2"><Input type="date" value={row.idCardsIssuanceDate} onChange={(e) => handleInputChange(row.id, "idCardsIssuanceDate", e.target.value)} disabled={isSubmitted || isPending} className="w-36" /></td>
                    <td className="p-2"><Input type="date" value={row.idCardReturnDate} onChange={(e) => handleInputChange(row.id, "idCardReturnDate", e.target.value)} disabled={isSubmitted || isPending} className="w-36" /></td>
                    <td className="p-2"><Input value={row.executiveSignature} onChange={(e) => handleInputChange(row.id, "executiveSignature", e.target.value)} disabled={isSubmitted || isPending} className="w-28" /></td>
                    <td className="p-2"><Input value={row.remarks} onChange={(e) => handleInputChange(row.id, "remarks", e.target.value)} disabled={isSubmitted || isPending} className="w-40" /></td>
                    <td className="p-2 text-center">
                      <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={isSubmitted || isPending || rows.length <= 1}>
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