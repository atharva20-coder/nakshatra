"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, CheckCircle, Lock } from "lucide-react";
import { cmApproveWithSessionAction } from "@/actions/cm-session.action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ApprovalButtonProps {
  rowId: string | number;
  formType: string;
  formId: string;
  fieldToUpdate: string;
  cmSessionId: string | null; // Current active CM session
  onApprovalSuccess: (rowId: string | number, approvalData: {
    signature: string;
    timestamp: string;
    collectionManager: {
      name: string;
      email: string;
      designation: string;
      productTag: string;
    };
  }) => void;
  disabled?: boolean;
  isApproved?: boolean;
  approvalSignature?: string;
}

export const ApprovalButton = ({ 
  rowId, 
  formType,
  formId,
  fieldToUpdate,
  cmSessionId,
  onApprovalSuccess, 
  disabled = false,
  isApproved = false,
  approvalSignature
}: ApprovalButtonProps) => {
  const [showRemarksDialog, setShowRemarksDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleApprove = async () => {
    if (!cmSessionId) {
      toast.error("Collection Manager must be logged in to approve");
      return;
    }

    setIsPending(true);
    
    try {
      const result = await cmApproveWithSessionAction({
        cmSessionId,
        formType,
        formId,
        rowId: String(rowId),
        fieldToUpdate,
        remarks: remarks || undefined
      });

      if (result.error) {
        toast.error(result.error);
        if (result.error.includes("expired")) {
          // Session expired, trigger logout/refresh
          window.location.reload();
        }
      } else if (result.success && result.approvalSignature && result.collectionManager) {
        toast.success(`Record approved by ${result.collectionManager.name}`);
        onApprovalSuccess(rowId, {
          signature: result.approvalSignature,
          timestamp: result.timestamp,
          collectionManager: result.collectionManager
        });
        setShowRemarksDialog(false);
        setRemarks("");
      }
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Failed to process approval");
    } finally {
      setIsPending(false);
    }
  };

  // If already approved, show approved status
  if (isApproved && approvalSignature) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Approved</span>
        </div>
        <span className="text-xs text-gray-600 break-words max-w-[200px]">
          {approvalSignature}
        </span>
      </div>
    );
  }

  // If no CM session, show locked state
  if (!cmSessionId) {
    return (
      <Button
        size="sm"
        disabled
        variant="outline"
        className="border-gray-300 text-gray-500"
        title="Collection Manager must login to approve"
      >
        <Lock className="h-4 w-4 mr-1" />
        CM Login Required
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setShowRemarksDialog(true)}
        disabled={disabled || isPending}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Shield className="h-4 w-4 mr-1" />
        Approve
      </Button>

      {/* Remarks Dialog */}
      <Dialog open={showRemarksDialog} onOpenChange={setShowRemarksDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Approve Record
            </DialogTitle>
            <DialogDescription>
              Add optional remarks for this approval. This will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-remarks" className="text-sm font-medium">
                Remarks (Optional)
              </Label>
              <Textarea
                id="approval-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes or comments about this approval..."
                rows={4}
                disabled={isPending}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                Your approval will be recorded with your logged-in credentials, timestamp, and IP address.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRemarksDialog(false);
                setRemarks("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};