// src/components/cm-approval-modal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react"; 
import { 
  getCMAgencyFormDetailsAction, 
  type ApprovalWithDetails 
} from "@/actions/collection-manager.action";
import { FormType, AgencyTableRow } from '@/types/forms'; 
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CMAgencyApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formType: FormType;
  agencyName: string;
}

type AdminFormData = {
  id: string;
  status: string;
  createdAt?: Date; 
  formTitle?: string;
  // Use a union type for details
  details: (AgencyTableRow & { id: string })[] | { id: string, [key: string]: unknown }[];
  agencyInfo?: { userId: string; name: string; email: string };
  [key: string]: unknown; 
} | null;

type FormDetails = {
  formData: AdminFormData;
  approvals: ApprovalWithDetails[]; 
};

export function CMAgencyApprovalModal({ 
  isOpen, 
  onClose, 
  formId, 
  formType, 
  agencyName 
}: CMAgencyApprovalModalProps) {
  
  const [details, setDetails] = useState<FormDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCMAgencyFormDetailsAction(formId, formType);
      if (result.error || !result.success) {
        setError(result.error || "Failed to load form details.");
      } else {
        setDetails({
          formData: result.formData as AdminFormData,
          approvals: result.approvals as ApprovalWithDetails[]
        });
      }
    } catch (err: unknown) { 
      console.error("Failed to fetch form details:", err); 
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [formId, formType]); 

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
    } else {
      // Reset state when modal is closed
      setDetails(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, fetchDetails]); 

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to render the specific details of the form
  const renderFormContent = () => {
    if (!details?.formData?.details) {
      return <p className="text-sm text-gray-500">No detailed rows found for this form.</p>;
    }

    // Specific renderer for Agency Visits
    if (formType === 'agencyVisits') {
      // FIX: Use a strong 'as unknown as' cast to resolve the union type error
      const formRows = details.formData.details as unknown as (AgencyTableRow & { id: string })[];
      return (
        <div className="space-y-2">
          <h4 className="font-semibold">Visit Details</h4>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Purpose of Visit</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formRows.map((row) => ( 
                  <TableRow key={row.id}>
                    <TableCell>{row.employeeName || 'N/A'}</TableCell>
                    <TableCell>{row.purposeOfVisit || 'N/A'}</TableCell>
                    <TableCell>{row.dateOfVisit}</TableCell>
                    <TableCell>{row.timeIn}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    // A generic renderer for other forms
    const formRows = details.formData.details as { id: string, [key: string]: unknown }[]; 
    const headers = Object.keys(formRows[0] || {}).filter(key => key !== 'id');
    return (
       <div className="space-y-2">
          <h4 className="font-semibold">Form Rows</h4>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formRows.map((row) => ( 
                  <TableRow key={row.id}>
                    {headers.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{details?.formData?.formTitle || `Loading Form...`}</DialogTitle>
          <DialogDescription>
            Showing details for {agencyName}
            {details?.formData?.createdAt && ` | Submitted: ${formatDate(details.formData.createdAt)}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-rose-900" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && details && (
            <div className="space-y-6">
              {/* 1. Form Content (e.g., Visit Rows) */}
              {renderFormContent()}

              {/* 2. Your Approvals for this Form */}
              <div className="space-y-2">
                <h4 className="font-semibold">Your Approvals on this Form</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Approved Row</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.approvals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No approval records found from you for this form.
                          </TableCell>
                        </TableRow>
                      ) : (
                        details.approvals.map((approval) => (
                          <TableRow key={approval.id}>
                            <TableCell className="text-xs">{formatDate(approval.createdAt)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{approval.productTag}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {approval.details ? (
                                <div>
                                  <p className="font-medium">{approval.details.employeeName}</p>
                                  <p className="text-xs text-gray-500">{approval.details.purposeOfVisit}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {approval.remarks || <span className="text-gray-400 italic">No remarks</span>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}