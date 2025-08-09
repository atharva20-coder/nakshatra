"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReturnButton } from "@/components/return-button";
import { submitApprovalRequestAction } from "@/actions/form-management.action";
import { toast } from "sonner";
import { FileUp, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ApprovalRequestForm() {
  const [isPending, setIsPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requestType, setRequestType] = useState<
    "UPDATE_SUBMITTED_FORM" | "UPDATE_PREVIOUS_MONTH" | "DELETE_RECORD"
  >("UPDATE_SUBMITTED_FORM");
  const [reason, setReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const formType = searchParams.get("formType") || "";
  const formId = searchParams.get("formId") || "";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF, Word document, or image file");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request");
      return;
    }
    if (!selectedFile) {
      toast.error("Please upload supporting documentation");
      return;
    }

    setIsPending(true);
    try {
      const documentPath = `/uploads/${selectedFile.name}`;
      const result = await submitApprovalRequestAction(
        formType,
        formId,
        requestType,
        reason,
        documentPath
      );

      if (result.success) {
        toast.success("Approval request submitted successfully");
        window.location.href = "/dashboard";
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    } catch {
      toast.error("An error occurred while submitting the request");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <ReturnButton href="/dashboard" label="Back to Dashboard" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Request Approval for Form Changes
            </CardTitle>
            <CardDescription>
              Submit a request to modify or update a previously submitted form. Please provide valid documentation to support your request.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Request Type */}
              <div className="space-y-2">
                <Label htmlFor="requestType">Request Type</Label>
                <select
                  id="requestType"
                  value={requestType}
                  onChange={(e) =>
                    setRequestType(
                      e.target.value as
                        | "UPDATE_SUBMITTED_FORM"
                        | "UPDATE_PREVIOUS_MONTH"
                        | "DELETE_RECORD"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  disabled={isPending}
                >
                  <option value="UPDATE_SUBMITTED_FORM">Update Already Submitted Form</option>
                  <option value="UPDATE_PREVIOUS_MONTH">Update Previous Months Form</option>
                  <option value="DELETE_RECORD">Delete Record</option>
                </select>
              </div>

              {/* Form Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formType">Form Type</Label>
                  <Input id="formType" value={formType} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formId">Form ID</Label>
                  <Input id="formId" value={formId} readOnly className="bg-gray-100" />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Request *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a detailed explanation for why this change is necessary..."
                  rows={4}
                  disabled={isPending}
                  required
                />
                <p className="text-sm text-gray-500">
                  Be specific about what changes you need and why they&apos;re required.
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="document">Supporting Documentation *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={isPending}
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileUp className="w-8 h-8 text-green-600 mx-auto" />
                      <p className="font-medium text-green-700">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isPending}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileUp className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-gray-600">Upload supporting documentation</p>
                      <p className="text-sm text-gray-500">PDF, Word documents, or images up to 2MB</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isPending}
                      >
                        Select File
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Upload relevant documents that justify your request (emails, notifications, corrections, etc.)
                </p>
              </div>

              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Approval Guidelines:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Requests will be reviewed within 24-48 hours</li>
                  <li>• Valid documentation is required for all requests</li>
                  <li>• Previous month updates require strong justification</li>
                  <li>• Deletions must be supported by official correspondence</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  disabled={isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !reason.trim() || !selectedFile}
                  className="flex-1"
                >
                  {isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Important Notes:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• All requests require admin approval before changes can be made</li>
              <li>• You will be notified via email once your request is reviewed</li>
              <li>• Multiple requests for the same form may result in delays</li>
              <li>• Emergency requests can be made via phone during business hours</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
