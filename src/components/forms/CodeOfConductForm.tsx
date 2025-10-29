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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Badge } from "@/components/ui/badge"; // Import Badge


// ** MODIFIED INTERFACE STARTS HERE **
interface CodeOfConductFormProps {
  initialData?: {
    id: string;
    status: string;
    details: CodeOfConductRow[];
    agencyInfo?: { userId: string; name: string; email: string }; // Optional agency info for admin view
  } | null;
  isAdminView?: boolean; // Add this prop
}
// ** MODIFIED INTERFACE ENDS HERE **


const createNewRow = (id: number): CodeOfConductRow => {
  const now = new Date();
  return {
    id,
    name: "",
    signature: "",
    date: now.toISOString().split("T")[0], // Default to today in YYYY-MM-DD
  };
};

// ** MODIFIED COMPONENT SIGNATURE STARTS HERE **
export const CodeOfConductForm = ({ initialData, isAdminView = false }: CodeOfConductFormProps) => { // Destructure isAdminView
// ** MODIFIED COMPONENT SIGNATURE ENDS HERE **
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
    isSubmitted, // This state now reflects the form's DB status
    canEdit: canUserRequestEdit, // Renamed to avoid conflict
    refreshApprovalStatus,
    setIsSubmitted // Function to update local state if needed
  } = useFormApproval({
    formId: initialData?.id,
    formType: 'codeOfConduct',
    formStatus: initialData?.status
  });

   const initialRows = initialData?.details?.length
   ? initialData.details.map(d => ({ ...d, id: String(d.id) }))
   : [createNewRow(1)];

  const { rows, addRow, removeRow, handleInputChange } =
    useTableRows<CodeOfConductRow>(initialRows, createNewRow);

  // Determine if the form is truly editable based on role and status
  const isFormEditable = !isAdminView && canUserRequestEdit();

  const handleDelete = async () => {
    // Only allow deletion if NOT admin and form is editable (i.e., draft)
    if (isAdminView || !isFormEditable || !initialData?.id || isSubmitted) return;
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
    // Prevent save/submit in admin view
    if (isAdminView) return;

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
      const rowsData = rows.map(({ ...row }) => row);
      const result = await saveCodeOfConductAction(rowsData, status, initialData?.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || `Form successfully ${status === "DRAFT" ? "saved" : "submitted"}!`);
        if (status === "SUBMITTED") {
          setIsSubmitted(true); // Update local state immediately
          refreshApprovalStatus();
          router.push("/user/dashboard");
        } else if (result.formId && !initialData?.id) {
           router.push(`/user/forms/codeOfConduct/${result.formId}`);
        }
        router.refresh(); // Ensure server state is refetched
      }
    } catch (error) {
      console.error("Error saving form:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
       {/* Approval Status Alerts (only show if NOT admin view) */}
      {!isAdminView && (
        <ApprovalStatusAlerts
            approvalStatus={approvalStatus}
            isSubmitted={isSubmitted}
            canEdit={isFormEditable}
        />
      )}

      {/* Header - Conditionally show buttons */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{metadata.title}</h2>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
         <div className="flex gap-2">
            {/* History button available for admins and users viewing existing forms */}
           {session?.user && initialData?.id && (
             <Button variant="outline" onClick={() => setShowHistoryDialog(true)} disabled={isPending || isDeleting}>
               <History className="h-4 w-4 mr-2" /> View History
             </Button>
           )}
           {/* Request Edit only for users on submitted forms */}
           {!isAdminView && isSubmitted && !isFormEditable && (
             <Button variant="outline" onClick={() => setShowApprovalDialog(true)} disabled={isPending || approvalStatus.hasRequest}>
               Request Edit Access
             </Button>
           )}
            {/* Delete Draft only for users on draft forms */}
           {!isAdminView && initialData?.id && !isSubmitted && isFormEditable && (
             <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || isPending}>
               <Trash2 className="h-4 w-4 mr-2" /> Delete Draft
             </Button>
           )}
         </div>
      </div>

      {/* Resubmission Warning (only show if user is editing an approved form) */}
      {!isAdminView && !isSubmitted && initialData?.id && isFormEditable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/30 dark:border-amber-700">
           <div className="flex items-start gap-3">
               <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
               <div className="flex-1">
                   <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Editing Approved Form</h4>
                   <p className="text-sm text-amber-800 dark:text-amber-300">
                     Resubmitting will lock the form again. You&apos;ll need another approval for future edits.
                   </p>
               </div>
           </div>
        </div>
      )}

      {/* Collapsible Code of Conduct Section */}
       <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden dark:bg-gray-800 dark:border-gray-700">
         <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setShowCode(!showCode)}
         >
          <div>
            <h3 className="text-lg font-semibold">Code of Conduct Text</h3>
            {!showCode && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click to read full details.</p>}
          </div>
          {showCode ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
         </div>
        {/* AnimatePresence and motion.div for the collapsible content */}
         <AnimatePresence initial={false}>
          {showCode && (
             <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="prose prose-sm dark:prose-invert max-w-none px-6 pb-6 space-y-3 text-gray-700 dark:text-gray-300"
            >
              <p>
                As representatives of this agency, all members agree to uphold the
                highest standards of integrity, professionalism, and responsibility.
                This Code of Conduct ensures fairness, respect, and compliance with
                laws, policies, and ethical practices. By signing below, you commit
                to the following principles:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Conduct all activities with honesty, fairness, and transparency.</li>
                <li>Respect clients, colleagues, and stakeholders of all backgrounds.</li>
                <li>Avoid conflicts of interest and disclose any potential risks.</li>
                <li>Maintain confidentiality of sensitive information.</li>
                <li>Comply with laws, regulations, and organizational policies.</li>
                <li>Report unethical behavior, misconduct, or violations promptly.</li>
                <li>Strive for excellence, accountability, and professionalism.</li>
              </ul>
              <p>
                Breaches of this Code may result in disciplinary action, up to and
                including termination of engagement. Your acknowledgment below affirms
                your understanding and acceptance of these commitments.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Signature Table */}
       <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold">Signatures</h3>
              {/* Add button only visible and enabled if editable */}
             {isFormEditable && (
                 <Button onClick={addRow} disabled={isPending} variant="outline" size="sm">
                     + Add Signatory
                 </Button>
             )}
          </div>
          <div className="border rounded-lg overflow-x-auto dark:border-gray-700">
             <Table>
                 <TableHeader>
                     <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                         <TableHead className="min-w-[250px]">Name (Proprietor/Partner/Director)*</TableHead>
                         <TableHead className="min-w-[150px]">Signature*</TableHead>
                         <TableHead className="w-[150px]">Date*</TableHead>
                         {/* Actions column only if editable */}
                         {isFormEditable && <TableHead className="w-[80px] text-center">Actions</TableHead>}
                     </TableRow>
                 </TableHeader>
                 <TableBody>
                     {rows.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={isFormEditable ? 4 : 3} className="h-24 text-center text-muted-foreground">
                                {isFormEditable ? 'No signatories added yet. Click "+ Add Signatory" to begin.' : 'No signatories were added to this submission.'}
                            </TableCell>
                         </TableRow>
                     ) : (
                        rows.map((row) => (
                           <TableRow key={row.id}>
                               <TableCell>
                                   <Input
                                       value={row.name}
                                       onChange={(e) => handleInputChange(row.id, "name", e.target.value)}
                                       disabled={!isFormEditable || isPending} // Use isFormEditable
                                       placeholder="Enter full name"
                                       required
                                   />
                               </TableCell>
                               <TableCell>
                                   <Input
                                       value={row.signature}
                                       onChange={(e) => handleInputChange(row.id, "signature", e.target.value)}
                                       disabled={!isFormEditable || isPending} // Use isFormEditable
                                       placeholder="Enter signature"
                                       required
                                   />
                               </TableCell>
                               <TableCell>
                                   <Input
                                       type="date"
                                       value={row.date} // Expects YYYY-MM-DD
                                       onChange={(e) => handleInputChange(row.id, "date", e.target.value)}
                                       disabled={!isFormEditable || isPending} // Use isFormEditable
                                       required
                                   />
                               </TableCell>
                               {/* Render actions column only if editable */}
                               {isFormEditable && (
                                   <TableCell className="text-center">
                                       <Button
                                           variant="ghost"
                                           size="icon"
                                           onClick={() => removeRow(row.id)}
                                           disabled={!isFormEditable || isPending || rows.length <= 1} // Use isFormEditable
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

      {/* Action buttons (Only show if form is editable) */}
      {isFormEditable && (
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6 dark:border-gray-700">
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
            {initialData?.id && !isSubmitted ? "Resubmit Form" : "Submit Form"}
          </Button>
        </div>
      )}

       {/* Read-only message for admins or submitted forms */}
       {(isAdminView || (isSubmitted && !isFormEditable)) && (
          <div className="text-center py-4 text-muted-foreground mt-6 border-t dark:border-gray-700">
             <p className="text-sm">
                {isAdminView ? "Viewing submitted form (read-only)." : "This form is submitted and locked."}
             </p>
          </div>
        )}


      {/* Dialogs (Only needed if NOT admin view) */}
      {!isAdminView && initialData?.id && (
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