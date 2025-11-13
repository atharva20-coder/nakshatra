"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Building, User, Mail, Phone, MapPin, Lock } from "lucide-react";
import { toast } from "sonner";
import { createAuditingFirmAction } from "@/actions/auditor-registration.action";
import { useRouter } from "next/navigation";

export const AuditorRegistrationForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({
    firmName: "",
    address: "",
    auditorName: "",
    auditorEmail: "",
    contactPhone: "",
    auditorPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firmName.trim()) {
      newErrors.firmName = "Firm name is required";
    }
    if (!formData.auditorName.trim()) {
      newErrors.auditorName = "Key person name is required";
    }
    if (!formData.auditorEmail.trim()) {
      newErrors.auditorEmail = "Key person email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.auditorEmail)) {
      newErrors.auditorEmail = "Invalid email format";
    }
    if (!formData.auditorPassword) {
      newErrors.auditorPassword = "Password is required";
    } else if (formData.auditorPassword.length < 8) {
      newErrors.auditorPassword = "Password must be at least 8 characters";
    }
    if (formData.auditorPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    startTransition(async () => {
      const result = await createAuditingFirmAction({
        firmName: formData.firmName,
        auditorName: formData.auditorName,
        auditorEmail: formData.auditorEmail,
        auditorPassword: formData.auditorPassword,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || "Auditing firm registered successfully!");
        router.push("/super/auditing-firms");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Auditing Firm Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Auditing Firm Details
          </CardTitle>
          <CardDescription>
            Enter the official details of the auditing firm
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmName">
              Firm Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firmName"
              name="firmName"
              value={formData.firmName}
              onChange={handleInputChange}
              placeholder="e.g., ABC Auditing Services Pvt. Ltd."
              disabled={isPending}
              className={errors.firmName ? "border-red-500" : ""}
            />
            {errors.firmName && (
              <p className="text-sm text-red-500">{errors.firmName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This must be the unique, official name of the firm.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-gray-500" />
              Firm Address (Optional)
            </Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter firm's primary address"
              disabled={isPending}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Person (Auditor) Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Key Person Details
          </CardTitle>
          <CardDescription>
            Create login credentials for the firm&apos;s authorized representative
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="auditorName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="auditorName"
                name="auditorName"
                value={formData.auditorName}
                onChange={handleInputChange}
                placeholder="e.g., Jane Smith"
                disabled={isPending}
                className={errors.auditorName ? "border-red-500" : ""}
              />
              {errors.auditorName && (
                <p className="text-sm text-red-500">{errors.auditorName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="auditorEmail">
                Email Address (Login ID) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="auditorEmail"
                name="auditorEmail"
                type="email"
                value={formData.auditorEmail}
                onChange={handleInputChange}
                placeholder="e.g., jane@firm.com"
                disabled={isPending}
                className={errors.auditorEmail ? "border-red-500" : ""}
              />
              {errors.auditorEmail && (
                <p className="text-sm text-red-500">{errors.auditorEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-gray-500" />
                Contact Phone (Optional)
              </Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={handleInputChange}
                placeholder="e.g., +91 98765 43210"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auditorPassword">
                <Lock className="h-4 w-4 text-gray-500 inline mr-1" />
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="auditorPassword"
                name="auditorPassword"
                type="password"
                value={formData.auditorPassword}
                onChange={handleInputChange}
                placeholder="Minimum 8 characters"
                disabled={isPending}
                className={errors.auditorPassword ? "border-red-500" : ""}
              />
              {errors.auditorPassword && (
                <p className="text-sm text-red-500">{errors.auditorPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                <Lock className="h-4 w-4 text-gray-500 inline mr-1" />
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter password"
                disabled={isPending}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> The auditor can change this password after their first login.
              The email will be automatically verified.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-rose-800 hover:bg-rose-900 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Registering Firm...
            </>
          ) : (
            <>
              <Building className="h-4 w-4 mr-2" />
              Register Auditing Firm
            </>
          )}
        </Button>
      </div>
    </form>
  );
};