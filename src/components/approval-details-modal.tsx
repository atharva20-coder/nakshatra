// src/components/approval-details-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "./ui/badge";

// Define the structure of the approval object
interface ApprovalData {
  signature: string;
  timestamp: string;
  collectionManager: {
    name: string;
    email: string;
    designation: string;
    productTag: string;
  };
  remarks?: string; // Remarks are optional
}

interface ApprovalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalData: string | null;
}

export const ApprovalDetailsModal = ({
  isOpen,
  onClose,
  approvalData,
}: ApprovalDetailsModalProps) => {

  let data: ApprovalData | null = null;
  if (approvalData) {
    try {
      const parsed = JSON.parse(approvalData);
      // Check if it's a valid object with the keys we expect
      if (parsed && typeof parsed === 'object' && parsed.signature && parsed.collectionManager) {
        data = parsed;
      }
    } catch (error) {
      console.error("Failed to parse approval data:", error);
      // Data is likely an old, invalid string.
    }
    
    // Fallback for old signature-only strings or parse errors
    if (!data) {
      data = {
        signature: approvalData, // Show the raw string
        timestamp: "N/A",
        collectionManager: {
          name: "N/A",
          email: "N/A",
          designation: "N/A",
          productTag: "N/A",
        },
        remarks: "Invalid or outdated approval data.",
      };
    }
  }

  if (!isOpen || !data) return null; // Don't render if no data or not open

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Approval Details</DialogTitle>
          <DialogDescription>
            Details of the Collection Manager who approved this item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Name</span>
            <span className="col-span-2 text-sm">{data.collectionManager.name}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Email</span>
            <span className="col-span-2 text-sm">{data.collectionManager.email}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Designation</span>
            <span className="col-span-2 text-sm">{data.collectionManager.designation}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Product</span>
            <Badge variant="outline" className="col-span-2 w-fit">
              {data.collectionManager.productTag}
            </Badge>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Approved On</span>
            <span className="col-span-2 text-sm">
              {data.timestamp !== "N/A" ? new Date(data.timestamp).toLocaleString() : "N/A"}
            </span>
          </div>
          <div className="grid grid-cols-3 items-start gap-4">
            <span className="text-sm font-medium text-muted-foreground">Remarks</span>
            <p className="col-span-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md border dark:border-gray-700">
              {data.remarks || <span className="italic text-muted-foreground">No remarks provided.</span>}
            </p>
          </div>
          <div className="grid grid-cols-3 items-start gap-4">
            <span className="text-sm font-medium text-muted-foreground">Signature</span>
            <p className="col-span-2 text-xs text-muted-foreground break-all">
              {data.signature}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};