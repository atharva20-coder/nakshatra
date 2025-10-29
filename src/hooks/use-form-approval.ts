// src/hooks/use-form-approval.ts
"use client";

import { useState, useEffect } from "react";
import { checkFormApprovalStatusAction } from "@/actions/approval-request.action";

interface UseFormApprovalProps {
  formId?: string;
  formType: string;
  formStatus?: string;
}

interface ApprovalStatus {
  hasRequest: boolean;
  status?: string;
  requestId?: string;
  adminResponse?: string;
  documentPath?: string;
}

export function useFormApproval({ formId, formType, formStatus }: UseFormApprovalProps) {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>({ hasRequest: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(formStatus === 'SUBMITTED');

  useEffect(() => {
    setIsSubmitted(formStatus === 'SUBMITTED');
    
    if (formId && formStatus === "SUBMITTED") {
      checkApprovalStatus();
    } else if (formStatus === 'DRAFT') {
      // If status is DRAFT, clear approval status (form was approved and is now editable)
      setApprovalStatus({ hasRequest: false });
    }
  }, [formId, formStatus]);

  const checkApprovalStatus = async () => {
    if (!formId) return;
    
    setIsLoading(true);
    try {
      const result = await checkFormApprovalStatusAction(formId, formType);
      
      if (!result.error && result.hasRequest) {
        setApprovalStatus({
          hasRequest: true,
          status: result.status,
          requestId: result.requestId,
          adminResponse: result.adminResponse ?? undefined,
          documentPath: result.documentPath ?? undefined
        });
      } else {
        setApprovalStatus({ hasRequest: false });
      }
    } catch (error) {
      console.error("Error checking approval status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = () => {
    // User can edit if:
    // 1. Form is in DRAFT status (either never submitted or approved and reverted to DRAFT)
    // 2. OR form is SUBMITTED but has an APPROVED request (backward compatibility)
    if (!isSubmitted) return true;
    
    // If form is SUBMITTED and has an approved request, they can edit
    // (though the form should have been changed to DRAFT by the approval action)
    return approvalStatus.hasRequest && approvalStatus.status === 'APPROVED';
  };

  const refreshApprovalStatus = () => {
    checkApprovalStatus();
  };

  return {
    approvalStatus,
    isLoading,
    isSubmitted,
    setIsSubmitted,
    canEdit,
    refreshApprovalStatus
  };
}