"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { issueShowCauseNoticeAction } from "@/actions/show-cause-notice.action";
import { useRouter } from "next/navigation";

interface IssueSCNModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId: string;
  observationIds: string[];
}

export function IssueSCNModal({ isOpen, onClose, agencyId, observationIds }: IssueSCNModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = () => {
    if (!subject || !details || !dueDate) {
      toast.error("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      const result = await issueShowCauseNoticeAction(
        agencyId,
        observationIds,
        subject,
        details,
        new Date(dueDate)
      );

      if (result.success) {
        toast.success("Show Cause Notice issued successfully.");
        onClose();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Show Cause Notice</DialogTitle>
          <DialogDescription>
            You are issuing a notice for {observationIds.length} observation(s). 
            Please provide details and a response deadline.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Notice for October 2025 Audit Findings"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Details / Admin Remarks</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide a brief overview of the notice and any instructions for the agency."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Response Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue Notice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}