"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ToggleLeft, ToggleRight, UserX } from "lucide-react";
import { toast } from "sonner";
import { manageUserStatusAction } from "@/actions/user-management.action";

interface ManageUserStatusButtonProps {
  userId: string;
  isBanned: boolean;
}

export function ManageUserStatusButton({ userId, isBanned }: ManageUserStatusButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleActivate = () => {
    startTransition(async () => {
      const result = await manageUserStatusAction(userId, 'activate');
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message);
      }
    });
  };

  const handleDeactivate = () => {
    startTransition(async () => {
      const result = await manageUserStatusAction(userId, 'deactivate', reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message);
        setIsDialogOpen(false);
        setReason("");
      }
    });
  };

  if (isBanned) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleActivate}
        disabled={isPending}
        className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ToggleRight className="h-4 w-4" />
        )}
        <span className="ml-2">Activate</span>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={isPending}
        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700"
      >
        <ToggleLeft className="h-4 w-4" />
        <span className="ml-2">Deactivate</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              Deactivate User Account?
            </DialogTitle>
            <DialogDescription>
              The user will be blocked from logging in, but their data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason for Deactivation (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Agency contract ended."
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}