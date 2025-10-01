"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Trash, Save, Send, Loader2 } from 'lucide-react';
import { PaymentRegisterRow, FORM_CONFIGS } from "@/types/forms";
import { savePaymentRegisterAction, deletePaymentRegisterAction } from '@/actions/payment-register.action';

interface PaymentRegisterFormProps {
  initialData?: {
    id: string;
    status: string;
    details: PaymentRegisterRow[];
  } | null;
}

const createNewRow = (id: number): PaymentRegisterRow => ({
  id,
  srNo: String(id),
  month: "",
  eReceiptNo: "",
  accountNo: "",
  customerName: "",
  receiptAmount: "0",
  modeOfPayment: "",
  depositionDate: new Date().toISOString().split('T')[0],
  fosHhdId: "",
  fosName: "",
  fosSign: "",
  cmName: "",
  cmVerificationStatus: "",
  remarks: "",
});

export const PaymentRegisterForm = ({ initialData }: PaymentRegisterFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const metadata = FORM_CONFIGS.paymentRegister;

  const { rows, addRow, handleInputChange, removeRow } = useTableRows<PaymentRegisterRow>(
    initialData?.details?.length ? initialData.details.map(d => ({ ...d })) : [createNewRow(1)],
    createNewRow
  );

  useEffect(() => {
    setIsSubmitted(initialData?.status === "SUBMITTED");
  }, [initialData]);

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (rows.length === 0) {
      toast.error("Please add at least one payment entry.");
      return;
    }

    const hasEmptyFields = rows.some(
      row => !row.month || !row.eReceiptNo || !row.accountNo || !row.customerName || 
             !row.receiptAmount || !row.modeOfPayment || !row.depositionDate || 
             !row.fosHhdId || !row.fosName || !row.fosSign || !row.cmName || !row.cmVerificationStatus
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all required fields for each entry.");
      return;
    }

    setIsPending(true);
    const rowsToSubmit = rows.map(({ id, ...rest }) => rest);
    const result = await savePaymentRegisterAction(rowsToSubmit, status, initialData?.id);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
      if (status === "SUBMITTED") {
        router.push("/dashboard");
      } else if (result.formId) {
        router.push(`/forms/paymentRegister/${result.formId}`);
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
    const result = await deletePaymentRegisterAction(initialData.id);
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Records</h3>
          {!isSubmitted && (
            <Button onClick={addRow} disabled={isPending} variant="outline">
              Add Payment
            </Button>
          )}
        </div>
        
        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <tr>
                <th className="p-2 text-left font-medium">Sr No</th>
                <th className="p-2 text-left font-medium">Month</th>
                <th className="p-2 text-left font-medium">E-Receipt No</th>
                <th className="p-2 text-left font-medium">Account No</th>
                <th className="p-2 text-left font-medium">Customer Name</th>
                <th className="p-2 text-left font-medium">Receipt Amount</th>
                <th className="p-2 text-left font-medium">Mode of Payment</th>
                <th className="p-2 text-left font-medium">Deposition Date</th>
                <th className="p-2 text-left font-medium">FOS HHD ID</th>
                <th className="p-2 text-left font-medium">FOS Name</th>
                <th className="p-2 text-left font-medium">FOS Sign</th>
                <th className="p-2 text-left font-medium">CM Name</th>
                <th className="p-2 text-left font-medium">CM Verification</th>
                <th className="p-2 text-left font-medium">Remarks</th>
                <th className="p-2 text-center font-medium w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-gray-500">
                    No payments added yet. Click &quot;Add Payment&quot; to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="p-2">
                      <Input value={row.srNo} onChange={(e) => handleInputChange(row.id, "srNo", e.target.value)} disabled={isSubmitted || isPending} className="w-16" />
                    </td>
                    <td className="p-2">
                      <Input value={row.month} onChange={(e) => handleInputChange(row.id, "month", e.target.value)} disabled={isSubmitted || isPending} placeholder="Month" className="w-24" />
                    </td>
                    <td className="p-2">
                      <Input value={row.eReceiptNo} onChange={(e) => handleInputChange(row.id, "eReceiptNo", e.target.value)} disabled={isSubmitted || isPending} placeholder="Receipt No" className="w-32" />
                    </td>
                    <td className="p-2">
                      <Input value={row.accountNo} onChange={(e) => handleInputChange(row.id, "accountNo", e.target.value)} disabled={isSubmitted || isPending} placeholder="Account No" className="w-36" />
                    </td>
                    <td className="p-2">
                      <Input value={row.customerName} onChange={(e) => handleInputChange(row.id, "customerName", e.target.value)} disabled={isSubmitted || isPending} placeholder="Customer" className="w-40" />
                    </td>
                    <td className="p-2">
                      <Input type="number" value={row.receiptAmount} onChange={(e) => handleInputChange(row.id, "receiptAmount", e.target.value)} disabled={isSubmitted || isPending} placeholder="0.00" className="w-28" />
                    </td>
                    <td className="p-2">
                      <Input value={row.modeOfPayment} onChange={(e) => handleInputChange(row.id, "modeOfPayment", e.target.value)} disabled={isSubmitted || isPending} placeholder="Mode" className="w-28" />
                    </td>
                    <td className="p-2">
                      <Input type="date" value={row.depositionDate} onChange={(e) => handleInputChange(row.id, "depositionDate", e.target.value)} disabled={isSubmitted || isPending} className="w-36" />
                    </td>
                    <td className="p-2">
                      <Input value={row.fosHhdId} onChange={(e) => handleInputChange(row.id, "fosHhdId", e.target.value)} disabled={isSubmitted || isPending} placeholder="HHD ID" className="w-28" />
                    </td>
                    <td className="p-2">
                      <Input value={row.fosName} onChange={(e) => handleInputChange(row.id, "fosName", e.target.value)} disabled={isSubmitted || isPending} placeholder="FOS Name" className="w-32" />
                    </td>
                    <td className="p-2">
                      <Input value={row.fosSign} onChange={(e) => handleInputChange(row.id, "fosSign", e.target.value)} disabled={isSubmitted || isPending} placeholder="Signature" className="w-28" />
                    </td>
                    <td className="p-2">
                      <Input value={row.cmName} onChange={(e) => handleInputChange(row.id, "cmName", e.target.value)} disabled={isSubmitted || isPending} placeholder="CM Name" className="w-32" />
                    </td>
                    <td className="p-2">
                      <Input value={row.cmVerificationStatus} onChange={(e) => handleInputChange(row.id, "cmVerificationStatus", e.target.value)} disabled={isSubmitted || isPending} placeholder="Status" className="w-28" />
                    </td>
                    <td className="p-2">
                      <Input value={row.remarks} onChange={(e) => handleInputChange(row.id, "remarks", e.target.value)} disabled={isSubmitted || isPending} placeholder="Optional" className="w-40" />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={isSubmitted || isPending || rows.length <= 1}
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