// src/components/forms/CodeOfConductForm.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, History, AlertCircle, Save, Send, Loader2 } from "lucide-react";
import { saveCodeOfConductAction, deleteCodeOfConductAction } from "@/actions/code-of-conduct.action";
import { CodeOfConductRow, FORM_CONFIGS } from "@/types/forms";
import { ApprovalRequestDialog } from "@/components/approval-request-dialog";
import { ApprovalHistoryDialog } from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import { ApprovalStatusAlerts } from "@/components/forms/ApprovalStatusAlerts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    date: now.toISOString().split("T")[0], // Default to today in YYYY-MM-DD
  };
};

export const CodeOfConductForm = ({ initialData }: CodeOfConductFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const metadata = FORM_CONFIGS.codeOfConduct;

  const {
    approvalStatus,
    isSubmitted,
    canEdit,
    refreshApprovalStatus,
    setIsSubmitted
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'codeOfConduct',
    formStatus: initialData?.status
  });

   // Ensure initialData details have string IDs if useTableRows expects it
   const initialRows = initialData?.details?.length
   ? initialData.details.map(d => ({ ...d, id: String(d.id) })) // Convert DB ID to string if needed
   : [createNewRow(1)];


  const { rows, addRow, removeRow, handleInputChange } =
    useTableRows<CodeOfConductRow>(initialRows, createNewRow);

  const handleDelete = async () => {
    if (!initialData?.id || isSubmitted) return;
    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) return;

    setIsDeleting(true);
    try {
      const result = await deleteCodeOfConductAction(initialData.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Form deleted successfully");
        router.push("/user/dashboard");
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("An unexpected error occurred while deleting the form.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    const hasEmptyFields = rows.some(
      (row) => !row.name.trim() || !row.signature.trim() || !row.date.trim()
    );
    if (hasEmptyFields) {
      toast.error("Please fill in all required fields (Name, Signature, Date).");
      return;
    }
    if (rows.length === 0) {
      toast.error("Please add at least one signatory.");
      return;
    }

    if (status === "SUBMITTED" && initialData?.id && !isSubmitted) {
        const confirmed = confirm(
            "⚠️ Important: Resubmitting will lock the form again.\n\n" +
            "You'll need another approval for future edits.\n\n" +
            "Proceed with submission?"
        );
        if (!confirmed) return;
    }

    setIsPending(true);
    try {
      // Exclude temporary ID before sending to server
      const rowsData = rows.map(({ ...row }) => row);
      const result = await saveCodeOfConductAction(rowsData, status, initialData?.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
        if (status === "SUBMITTED") {
          setIsSubmitted(true);
          refreshApprovalStatus();
          router.push("/user/dashboard");
        } else if (result.formId && !initialData?.id) {
           router.push(`/user/forms/codeOfConduct/${result.formId}`);
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

  const currentCanEdit = canEdit();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ApprovalStatusAlerts
        approvalStatus={approvalStatus}
        isSubmitted={isSubmitted}
        canEdit={currentCanEdit}
      />

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
         <div className="flex gap-2">
           {session?.user && initialData?.id && (
             <Button variant="outline" onClick={() => setShowHistoryDialog(true)} disabled={isPending || isDeleting}>
               <History className="h-4 w-4 mr-2" /> View History
             </Button>
           )}
           {isSubmitted && !currentCanEdit && (
             <Button variant="outline" onClick={() => setShowApprovalDialog(true)} disabled={isPending || approvalStatus.hasRequest}>
               Request Edit Access
             </Button>
           )}
           {initialData?.id && !isSubmitted && (
             <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || isPending}>
               <Trash2 className="h-4 w-4 mr-2" /> Delete Draft
             </Button>
           )}
         </div>
      </div>

      {!isSubmitted && initialData?.id && currentCanEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
           <div className="flex items-start gap-3">
               <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
               <div className="flex-1">
                   <h4 className="font-semibold text-amber-900 mb-1">Editing Approved Form</h4>
                   <p className="text-sm text-amber-800">
                     Resubmitting will lock the form again. You&apos;ll need another approval for future edits.
                   </p>
               </div>
           </div>
        </div>
      )}

      {/* Collapsible Code of Conduct Section */}
       <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
         <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setShowCode(!showCode)}
         >
          <div>
            <h3 className="text-lg font-semibold">Code of Conduct Text</h3>
            {!showCode && <p className="text-sm text-gray-600 mt-1">Click to read full details.</p>}
          </div>
          {showCode ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
         </div>

        <AnimatePresence initial={false}>
          {showCode && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="prose prose-sm dark:prose-invert max-w-none px-6 pb-6 space-y-3 text-gray-700"
            >
              <p>
                As representatives of this agency, all members agree to uphold the
                highest standards of integrity, professionalism, and responsibility...
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Conduct all activities with honesty...</li>
                <li>Respect clients, colleagues...</li>
                <li>Avoid conflicts of interest...</li>
                <li>Maintain confidentiality...</li>
                <li>Comply with laws, regulations...</li>
                <li>Report unethical behavior...</li>
                <li>Strive for excellence...</li>
              </ul>
              <p>
                Breaches of this Code may result in disciplinary action...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Signature Table */}
       <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold">Signatures</h3>
             {currentCanEdit && (
                 <Button onClick={addRow} disabled={isPending} variant="outline" size="sm">
                     + Add Signatory
                 </Button>
             )}
          </div>
          <div className="border rounded-lg overflow-x-auto">
             <Table>
                 <TableHeader>
                     <TableRow>
                         <TableHead className="min-w-[250px]">Name (Proprietor/Partner/Director)*</TableHead>
                         <TableHead className="min-w-[150px]">Signature*</TableHead>
                         <TableHead className="w-[150px]">Date*</TableHead>
                         {currentCanEdit && <TableHead className="w-[80px] text-center">Actions</TableHead>}
                     </TableRow>
                 </TableHeader>
                 <TableBody>
                     {rows.length === 0 && currentCanEdit ? (
                         <TableRow>
                            <TableCell colSpan={currentCanEdit ? 4 : 3} className="h-24 text-center text-muted-foreground">
                                No signatories added yet. Click &ldquo;+ Add Signatory&rdquo; to begin.
                            </TableCell>
                         </TableRow>
                     ) : rows.length === 0 && !currentCanEdit ? (
                          <TableRow>
                            <TableCell colSpan={currentCanEdit ? 4 : 3} className="h-24 text-center text-muted-foreground">
                                No signatories were added to this submission.
                            </TableCell>
                         </TableRow>
                     ) : (
                        rows.map((row) => (
                           <TableRow key={row.id}>
                               <TableCell>
                                   <Input
                                       value={row.name}
                                       onChange={(e) => handleInputChange(row.id, "name", e.target.value)}
                                       disabled={!currentCanEdit || isPending}
                                       placeholder="Enter full name"
                                       required
                                   />
                               </TableCell>
                               <TableCell>
                                   <Input
                                       value={row.signature}
                                       onChange={(e) => handleInputChange(row.id, "signature", e.target.value)}
                                       disabled={!currentCanEdit || isPending}
                                       placeholder="Enter signature"
                                       required
                                   />
                               </TableCell>
                               <TableCell>
                                   <Input
                                       type="date"
                                       value={row.date} // Expects YYYY-MM-DD
                                       onChange={(e) => handleInputChange(row.id, "date", e.target.value)}
                                       disabled={!currentCanEdit || isPending}
                                       required
                                   />
                               </TableCell>
                               {currentCanEdit && (
                                   <TableCell className="text-center">
                                       <Button
                                           variant="ghost"
                                           size="icon"
                                           onClick={() => removeRow(row.id)}
                                           disabled={!currentCanEdit || isPending || rows.length <= 1}
                                           title={rows.length <= 1 ? "At least one signatory is required" : "Remove signatory"}
                                           className="hover:text-red-500"
                                       >
                                           <Trash2 className="h-4 w-4" />
                                       </Button>
                                   </TableCell>
                               )}
                           </TableRow>
                       ))
                     )}
                 </TableBody>
             </Table>
          </div>
       </div>

      {/* Action buttons */}
      {currentCanEdit && (
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => handleSaveOrSubmit("DRAFT")}
            disabled={isPending || isDeleting}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSaveOrSubmit("SUBMITTED")}
            disabled={isPending || isDeleting}
            className="bg-rose-800 hover:bg-rose-900 text-white"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
             {/* Text changes based on context */}
            {initialData?.id && !isSubmitted ? "Resubmit Form" : "Submit Form"}
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {initialData?.id && (
        <>
          <ApprovalRequestDialog
            isOpen={showApprovalDialog}
            onClose={() => setShowApprovalDialog(false)}
            formType="codeOfConduct"
            formId={initialData.id}
            onSuccess={() => { refreshApprovalStatus(); router.refresh(); }}
          />
          {session?.user && (
            <ApprovalHistoryDialog
              isOpen={showHistoryDialog}
              onClose={() => setShowHistoryDialog(false)}
              formId={initialData.id}
              formType="codeOfConduct"
              formTitle={metadata.title}
            />
          )}
        </>
      )}
    </div>
  );
};