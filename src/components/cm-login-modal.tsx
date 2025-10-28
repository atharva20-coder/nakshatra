"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogIn, Shield, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cmLoginOnAgencySessionAction } from "@/actions/cm-session.action";

interface CMLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (sessionData: {
    sessionId: string;
    cmName: string;
    cmEmail: string;
    productTag: string;
    expiresIn: number;
  }) => void;
}

const PRODUCT_TAGS = [
  "Credit Card",
  "Personal Loan",
  "Home Loan",
  "Auto Loan",
  "Business Loan",
  "Gold Loan",
  "Loan Against Property",
  "Two Wheeler Loan",
  "Consumer Durable Loan",
  "Other"
];

export default function CMLoginModal({ isOpen, onClose, onLoginSuccess }: CMLoginModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    productTag: ""
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.productTag) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsPending(true);
    
    try {
      const result = await cmLoginOnAgencySessionAction(formData);

      if (result.error) {
        toast.error(result.error);
      } else if (result.success && result.sessionId) {
        toast.success(`Welcome, ${result.cmName}! Session active for ${result.expiresIn} minutes.`);
        onLoginSuccess({
          sessionId: result.sessionId,
          cmName: result.cmName,
          cmEmail: result.cmEmail,
          productTag: result.productTag,
          expiresIn: result.expiresIn
        });
        handleClose();
      }
    } catch (error) {
      console.error("Error logging in CM:", error);
      toast.error("Failed to login. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: "",
      password: "",
      productTag: ""
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl">Collection Manager Login</DialogTitle>
          </div>
          <DialogDescription>
            Login with your Collection Manager credentials to approve records on this agency session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Secure Login</p>
                <p>This creates a temporary session on this agency&apos;s computer. Your login activity will be logged for audit purposes.</p>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="cm-email" className="text-sm font-medium">
              Collection Manager Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cm-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@company.com"
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="cm-password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cm-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              disabled={isPending}
              autoComplete="current-password"
            />
          </div>

          {/* Product Tag */}
          <div className="space-y-2">
            <Label htmlFor="product-tag" className="text-sm font-medium">
              Product Tag <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.productTag}
              onValueChange={(value) => setFormData({ ...formData, productTag: value })}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your product responsibility" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Session Duration</p>
                <p>Your session will remain active for 15 minutes of inactivity. You&apos;ll need to login again if it expires.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Login to Approve
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}