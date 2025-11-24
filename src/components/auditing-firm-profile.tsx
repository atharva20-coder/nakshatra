"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAuditingFirmProfileAction } from "@/actions/auditing-firm-profile.action";
import { AuditingFirm } from "@/generated/prisma";

export const AuditingFirmProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firm, setFirm] = useState<AuditingFirm | null>(null);

  useEffect(() => {
    const fetchFirmProfile = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getAuditingFirmProfileAction();
      if (result.error) {
        setError(result.error);
      } else if (result.firm) {
        setFirm(result.firm);
      }
      setIsLoading(false);
    };

    fetchFirmProfile();
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">
            Auditing Firm Details
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-rose-800" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Firm Profile</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!firm) {
    return null; // Should be handled by error state, but as a fallback
  }

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="dark:text-gray-100">
          Auditing Firm Details
        </CardTitle>
        <CardDescription>
          Details of the firm you are associated with.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="firmName" className="dark:text-gray-300">
              Firm Name
            </Label>
            <Input
              id="firmName"
              value={firm.name}
              readOnly
              className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson" className="dark:text-gray-300">
              Contact Person
            </Label>
            <Input
              id="contactPerson"
              value={firm.contactPerson || "N/A"}
              readOnly
              className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone" className="dark:text-gray-300">
              Contact Phone
            </Label>
            <Input
              id="contactPhone"
              value={firm.contactPhone || "N/A"}
              readOnly
              className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="contactEmail" className="dark:text-gray-300">
              Contact Email
            </Label>
            <Input
              id="contactEmail"
              value={firm.contactEmail || "N/A"}
              readOnly
              className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="address" className="dark:text-gray-300">
              Firm Address
            </Label>
            <Textarea
              id="address"
              value={firm.address || "N/A"}
              readOnly
              rows={3}
              className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};