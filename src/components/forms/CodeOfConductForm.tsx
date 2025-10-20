"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { TableForm } from "@/components/table-forms";
import { Input } from "@/components/ui/input";
import {
  saveCodeOfConductAction,
  deleteCodeOfConductAction,
} from "@/actions/code-of-conduct.action";
import { cn } from "@/lib/utils";
import { CodeOfConductRow, FORM_CONFIGS } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";

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
    date: now.toISOString().split("T")[0],
  };
};

export const CodeOfConductForm = ({ initialData }: CodeOfConductFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCode, setShowCode] = useState(false); // toggle for collapsible block
  const metadata = FORM_CONFIGS.codeOfConduct;

  const { rows, addRow, removeRow, handleInputChange } =
    useTableRows<CodeOfConductRow>(
      initialData?.details ?? [createNewRow(1)],
      createNewRow
    );

  useEffect(() => {
    if (initialData) {
      if (initialData.status === "SUBMITTED") {
        setIsSubmitted(true);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [initialData]);

  const handleDelete = async () => {
    if (!initialData?.id || isSubmitted) return;

    if (
      !confirm(
        "Are you sure you want to delete this form? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteCodeOfConductAction(initialData.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Form deleted successfully");
        router.push("/user/dashboard");
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
      toast.error("Please fill in all required fields.");
      return;
    }

    if (rows.length === 0) {
      toast.error("Please add at least one row.");
      return;
    }

    setIsPending(true);

    try {
      const rowsData = rows.map(({ ...row }) => row);

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
          router.push("/user/dashboard");
        } else if (result.formId) {
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

  const headers = [
    { label: "Name (Proprietor/Partner/Director)", required: true },
    { label: "Signature", required: true },
    { label: "Date", required: true },
    { label: "Actions", required: false },
  ];

  const renderCell = (
    row: CodeOfConductRow,
    key: keyof CodeOfConductRow | "actions"
  ) => {
    const isDisabled = isPending || initialData?.status === "SUBMITTED";

    if (key === "actions") {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeRow(row.id)}
          disabled={
            isDisabled || rows.length <= 1 || initialData?.status === "SUBMITTED"
          }
          className={cn("hover:text-red-500", {
            "opacity-50 cursor-not-allowed": isDisabled || rows.length <= 1,
          })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <Input
        type={key === "date" ? "date" : "text"}
        value={row[key] || ""}
        onChange={(e) => handleInputChange(row.id, key, e.target.value)}
        className={cn("w-full min-w-[180px]", {
          "opacity-50 cursor-not-allowed": isDisabled,
        })}
        disabled={isDisabled}
        placeholder={
          key === "name"
            ? "Enter full name"
            : key === "signature"
            ? "Enter signature"
            : key === "date"
            ? "Select date"
            : ""
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
    <div className="space-y-6">
      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            📋 This form has been submitted and cannot be edited.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold">{metadata.title}</h2>
        <p className="text-gray-600 mt-2">{metadata.description}</p>
      </div>

      {/* Collapsible Code of Conduct Section with Animation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setShowCode(!showCode)}
        >
          <div>
            <h3 className="text-lg font-semibold">Code of Conduct</h3>
            {!showCode && (
              <p className="text-sm text-gray-600 mt-1">
                A summary of principles on integrity, professionalism, and
                accountability. Click to read full details.
              </p>
            )}
          </div>
          {showCode ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>

        <AnimatePresence initial={false}>
          {showCode && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="px-6 pb-6 space-y-4"
            >
              <p className="text-gray-700">
                As representatives of this agency, all members agree to uphold the
                highest standards of integrity, professionalism, and responsibility.
                This Code of Conduct ensures fairness, respect, and compliance with
                laws, policies, and ethical practices. By signing below, you commit
                to the following principles:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Conduct all activities with honesty, fairness, and transparency.</li>
                <li>Respect clients, colleagues, and stakeholders of all backgrounds.</li>
                <li>Avoid conflicts of interest and disclose any potential risks.</li>
                <li>Maintain confidentiality of sensitive information.</li>
                <li>Comply with laws, regulations, and organizational policies.</li>
                <li>Report unethical behavior, misconduct, or violations promptly.</li>
                <li>Strive for excellence, accountability, and professionalism.</li>
              </ul>
              <p className="text-gray-700">
                Breaches of this Code may result in disciplinary action, up to and
                including termination of engagement. Your acknowledgment below affirms
                your understanding and acceptance of these commitments.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Signature Table Form */}
      <TableForm
        headers={headers}
        rows={rows}
        renderCell={(row, key) =>
          renderCell(row as CodeOfConductRow, key as keyof CodeOfConductRow | "actions")
        }
        onAddRow={isSubmitted ? undefined : addRow}
        onSave={isSubmitted ? undefined : () => handleSaveOrSubmit("DRAFT")}
        onSubmit={isSubmitted ? undefined : () => handleSaveOrSubmit("SUBMITTED")}
        isPending={isPending}
        showActions={!isSubmitted}
      />

      {initialData?.id && !isSubmitted && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isPending}
          >
            {isDeleting ? "Deleting..." : "Delete Form"}
          </Button>
        </div>
      )}
    </div>
  );
};
