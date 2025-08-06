"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

// The component takes the row ID and a callback function
interface ApprovalButtonProps {
  rowId: number;
  onApprovalSuccess: (rowId: number) => void;
}

export const ApprovalButton = ({ rowId, onApprovalSuccess }: ApprovalButtonProps) => {
  const [isPending, setIsPending] = useState(false);

  const handleApproveClick = async () => {
    setIsPending(true);
    
    // In the future, this is where you would:
    // 1. Call a server action to get a QR code token.
    // 2. Open a modal to display the QR code.
    // 3. Start polling for the signature status.
    // 4. On success, call the onApprovalSuccess callback.
    
    // For now, we'll simulate a quick async operation.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success(`Row ${rowId} approved successfully!`);
    onApprovalSuccess(rowId);

    setIsPending(false);
  };

  return (
    <Button size="sm" onClick={handleApproveClick} disabled={isPending}>
      {isPending ? "Approving..." : "Approve"}
    </Button>
  );
};
