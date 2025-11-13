"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFormHistoryAction } from "@/actions/monthly-refresh.action";
import { FormType } from "@/types/forms";
import { Calendar, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface FormHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  formType: FormType;
  formTitle: string;
}

interface HistorySubmission {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
}

export function FormHistoryDialog({
  isOpen,
  onClose,
  userId,
  formType,
  formTitle
}: FormHistoryDialogProps) {
  const [submissions, setSubmissions] = useState<HistorySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      const result = await getFormHistoryAction(userId, formType);
      
      if (result.error) {
        console.error("Error fetching history:", result.error);
        setSubmissions([]);
      } else {
        setSubmissions((result.submissions as HistorySubmission[]) || []);
      }
      
      setIsLoading(false);
    };

    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, userId, formType]);

  const getMonthYear = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission History: {formTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No previous submissions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission, index) => (
                <div
                  key={submission.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {getMonthYear(submission.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {submission.status}
                    </Badge>
                  </div>

                  <div className="flex justify-end mt-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/forms/${formType}/${submission.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}