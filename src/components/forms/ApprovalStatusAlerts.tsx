"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

interface ApprovalStatusAlertsProps {
  approvalStatus: {
    hasRequest: boolean;
    status?: string;
    adminResponse?: string;
  };
  isSubmitted: boolean;
  canEdit: boolean;
}

export const ApprovalStatusAlerts: React.FC<ApprovalStatusAlertsProps> = ({
  approvalStatus,
  isSubmitted,
  canEdit
}) => {
  return (
    <>
      {approvalStatus.hasRequest && approvalStatus.status === 'PENDING' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="font-medium mb-1">Approval Request Pending</div>
            <div className="text-sm">
              You have a pending approval request for this form. You can edit once the admin approves your request.
            </div>
            {approvalStatus.adminResponse && (
              <div className="mt-2 text-sm italic">Admin message: {approvalStatus.adminResponse}</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {approvalStatus.hasRequest && approvalStatus.status === 'APPROVED' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium mb-1">Edit Access Approved</div>
            <div className="text-sm">Your request to edit this form has been approved.</div>
          </AlertDescription>
        </Alert>
      )}

      {approvalStatus.hasRequest && approvalStatus.status === 'REJECTED' && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-1">Edit Request Rejected</div>
            {approvalStatus.adminResponse && (
              <div className="text-sm">Reason: {approvalStatus.adminResponse}</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isSubmitted && !canEdit && !approvalStatus.hasRequest && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-center font-medium">
          <AlertCircle className="h-5 w-5 inline-block mr-2" />
          <span>This form has been submitted and cannot be edited without approval.</span>
        </div>
      )}
    </>
  );
};