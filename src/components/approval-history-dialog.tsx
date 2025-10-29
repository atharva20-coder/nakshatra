"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, FileText, AlertCircle } from "lucide-react";
import { getFormApprovalHistoryAction } from "@/actions/approval-request.action";
import { ApprovalStatus } from "@/generated/prisma";

interface ApprovalHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formType: string;
  formTitle: string;
}

interface ApprovalHistoryItem {
  id: string;
  requestType: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt?: Date | null;
  adminResponse?: string | null;
  documentPath?: string | null;
}

export const ApprovalHistoryDialog: React.FC<ApprovalHistoryDialogProps> = ({
  isOpen,
  onClose,
  formId,
  formType,
  formTitle,
}) => {
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, formId, formType]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const result = await getFormApprovalHistoryAction(formId, formType);
      if (!result.error && result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      console.error("Error fetching approval history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.PENDING:
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case ApprovalStatus.APPROVED:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case ApprovalStatus.REJECTED:
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case ApprovalStatus.APPROVED:
        return "bg-green-100 text-green-800 border-green-300";
      case ApprovalStatus.REJECTED:
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approval Request History</DialogTitle>
          <DialogDescription>
            All approval requests for {formTitle}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium mb-2">No Approval Requests</p>
            <p className="text-gray-500 text-sm">
              You haven&apos;t requested any approvals for this form yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  item.status === ApprovalStatus.APPROVED
                    ? "border-green-200 bg-green-50"
                    : item.status === ApprovalStatus.REJECTED
                    ? "border-red-200 bg-red-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          Request #{history.length - index}
                        </span>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(item.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="text-xs">
                    {item.requestType.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Request Details */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Your Reason:
                    </h4>
                    <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                      {item.reason}
                    </p>
                  </div>

                  {item.documentPath && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                        Supporting Document:
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <a href={item.documentPath} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          View Document
                        </a>
                      </Button>
                    </div>
                  )}

                  {item.adminResponse && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                        Admin Response:
                      </h4>
                      <p className={`text-sm p-2 rounded border ${
                        item.status === ApprovalStatus.APPROVED
                          ? "bg-green-100 border-green-200 text-green-800"
                          : item.status === ApprovalStatus.REJECTED
                          ? "bg-red-100 border-red-200 text-red-800"
                          : "bg-blue-100 border-blue-200 text-blue-800"
                      }`}>
                        {item.adminResponse}
                      </p>
                    </div>
                  )}

                  {item.reviewedAt && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                      <Clock className="h-3 w-3" />
                      <span>
                        Reviewed on {new Date(item.reviewedAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                  )}

                  {/* Status Messages */}
                  {item.status === ApprovalStatus.APPROVED && (
                    <div className="flex items-start gap-2 bg-green-100 border border-green-300 rounded p-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="text-green-800">
                        <span className="font-medium">Approved:</span> Form status was changed to DRAFT. You were able to edit and resubmit the form.
                      </div>
                    </div>
                  )}

                  {item.status === ApprovalStatus.REJECTED && (
                    <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded p-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="text-red-800">
                        <span className="font-medium">Rejected:</span> Your request was denied. Please review the admin response above.
                      </div>
                    </div>
                  )}

                  {item.status === ApprovalStatus.PENDING && (
                    <div className="flex items-start gap-2 bg-yellow-100 border border-yellow-300 rounded p-2 text-sm">
                      <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-yellow-800">
                        <span className="font-medium">Pending:</span> Waiting for admin review. You&apos;ll be notified once it&apos;s processed.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};