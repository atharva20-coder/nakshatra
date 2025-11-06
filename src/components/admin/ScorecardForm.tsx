// src/components/admin/ScorecardForm.tsx
"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AuditScorecard } from "@/generated/prisma";
import { Textarea } from "@/components/ui/textarea";
import { saveAuditScorecardAction } from "@/actions/audit-management.action";
import { useRouter } from "next/navigation";

interface ScorecardFormProps {
  auditId: string;
  initialData: AuditScorecard | null;
}

export const ScorecardForm = ({ auditId, initialData }: ScorecardFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    auditPeriod: initialData?.auditPeriod || "",
    auditScore: initialData?.auditScore || 0,
    auditGrade: initialData?.auditGrade || "",
    auditCategory: initialData?.auditCategory || "",
    finalObservation: initialData?.finalObservation || "",
    justification: initialData?.justification || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'auditScore' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.auditPeriod || !formData.auditGrade || !formData.auditCategory) {
      toast.error("Please fill in Period, Grade, and Category.");
      return;
    }

    startTransition(async () => {
      const result = await saveAuditScorecardAction({
        ...formData,
        auditId: auditId,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Scorecard published successfully!");
        router.refresh(); // Refresh to show new data
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Agency Audit Rating & Scorecard</CardTitle>
          <CardDescription>
            {initialData 
              ? "Update the published scorecard." 
              : "Fill in the details below to publish the scorecard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="auditPeriod">Audit Period*</Label>
              <Input
                id="auditPeriod"
                name="auditPeriod"
                value={formData.auditPeriod}
                onChange={handleInputChange}
                placeholder="e.g., Jan-2025 to Mar-2025"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auditScore">Audit Score*</Label>
              <Input
                id="auditScore"
                name="auditScore"
                type="number"
                value={formData.auditScore}
                onChange={handleInputChange}
                placeholder="e.g., 85.5"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auditGrade">Audit Grade*</Label>
              <Input
                id="auditGrade"
                name="auditGrade"
                value={formData.auditGrade}
                onChange={handleInputChange}
                placeholder="e.g., A, B, C"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auditCategory">Audit Category*</Label>
              <Input
                id="auditCategory"
                name="auditCategory"
                value={formData.auditCategory}
                onChange={handleInputChange}
                placeholder="e.g., High Risk"
                disabled={isPending}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="finalObservation">Final Observation</Label>
              <Textarea
                id="finalObservation"
                name="finalObservation"
                value={formData.finalObservation}
                onChange={handleInputChange}
                placeholder="Enter final summary observation..."
                rows={5}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                name="justification"
                value={formData.justification}
                onChange={handleInputChange}
                placeholder="Enter justification for the score/grade..."
                rows={5}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {initialData ? "Update Scorecard" : "Publish Scorecard"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};