"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createApprovalRequestAction } from "@/actions/approval-request.action";
import { ApprovalType } from "@/generated/prisma";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ApprovalRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formType: string;
  formId: string;
  onSuccess?: () => void;
}

export function ApprovalRequestDialog({
  isOpen,
  onClose,
  formType,
  formId,
  onSuccess
}: ApprovalRequestDialogProps) {
  const [requestType, setRequestType] = useState<ApprovalType>(ApprovalType.UPDATE_SUBMITTED_FORM);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request");
      return;
    }

    setIsSubmitting(true);

    const result = await createApprovalRequestAction({
      formType,
      formId,
      requestType,
      reason: reason.trim()
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Approval request submitted successfully!");
      setReason("");
      onClose();
      onSuccess?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Form Update Approval</DialogTitle>
          <DialogDescription>
            Submit a request to admin for permission to update this submitted form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Request Type</Label>
            <RadioGroup value={requestType} onValueChange={(value) => setRequestType(value as ApprovalType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ApprovalType.UPDATE_SUBMITTED_FORM} id="update" />
                <Label htmlFor="update" className="font-normal cursor-pointer">
                  Update Submitted Form
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ApprovalType.UPDATE_PREVIOUS_MONTH} id="previous" />
                <Label htmlFor="previous" className="font-normal cursor-pointer">
                  Update Previous Month Form
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ApprovalType.DELETE_RECORD} id="delete" />
                <Label htmlFor="delete" className="font-normal cursor-pointer">
                  Delete Record
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Request *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need to update this form..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              Provide detailed information to help admin review your request.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-rose-800 hover:bg-rose-900">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}