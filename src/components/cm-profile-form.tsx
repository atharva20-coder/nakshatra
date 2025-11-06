"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getCMProfileAction, updateCMProfileAction } from "@/actions/collection-manager.action";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Type-safe local form shape
type FormData = {
  employeeId: string;
  designation: string;
  department: string;
  productsAssigned: string;
  supervisorName: string;
  supervisorEmployeeId: string;
  supervisorDesignation: string;
};

export const CollectionManagerProfileForm = () => {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    employeeId: "",
    designation: "",
    department: "",
    productsAssigned: "",
    supervisorName: "",
    supervisorEmployeeId: "",
    supervisorDesignation: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getCMProfileAction();
      if (result.error) {
        setError(result.error);
      } else if (result.profile) {
        setFormData({
          employeeId: result.profile.employeeId || "",
          designation: result.profile.designation || "",
          department: result.profile.department || "",
          productsAssigned: (result.profile.productAssigned === "N/A"
            ? ""
            : result.profile.productAssigned) || "",
          supervisorName: result.profile.supervisorName || "",
          supervisorEmployeeId: result.profile.supervisorEmployeeId || "",
          supervisorDesignation: result.profile.supervisorDesignation || "",
        });
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCMProfileAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.message) {
        toast.success(result.message);
      }
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Collection Manager Details</CardTitle>
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
        <AlertTitle>Error Loading Profile</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* --- CARD 1: INFORMATION --- */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Collection Manager Information</CardTitle>
          <CardDescription>
            Update your professional details. This information is visible to admins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="dark:text-gray-300">
                Employee ID
              </Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="e.g., CM-123456"
                disabled={isPending}
                required
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation" className="dark:text-gray-300">
                Designation
              </Label>
              <Input
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g., Senior Collection Manager"
                disabled={isPending}
                required
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="dark:text-gray-300">
                Department (Optional)
              </Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Collections - North Zone"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productsAssigned" className="dark:text-gray-300">
                Products Assigned
              </Label>
              <Input
                id="productsAssigned"
                name="productsAssigned"
                value={formData.productsAssigned}
                onChange={handleChange}
                placeholder="e.g., Credit Cards, Personal Loans"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
              <p className="text-xs text-muted-foreground">
                Enter products separated by a comma.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- CARD 2: SUPERVISOR DETAILS --- */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100 flex items-center">
            <Users className="mr-2 h-5 w-5" /> Supervisor Details
          </CardTitle>
          <CardDescription>
            Provide your immediate supervisor’s details for escalation purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supervisorName" className="dark:text-gray-300">
                Supervisor Name
              </Label>
              <Input
                id="supervisorName"
                name="supervisorName"
                value={formData.supervisorName}
                onChange={handleChange}
                placeholder="e.g., Rajesh Kumar"
                disabled={isPending}
                required
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisorEmployeeId" className="dark:text-gray-300">
                Supervisor Employee ID
              </Label>
              <Input
                id="supervisorEmployeeId"
                name="supervisorEmployeeId"
                value={formData.supervisorEmployeeId}
                onChange={handleChange}
                placeholder="e.g., CM-100001"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supervisorDesignation" className="dark:text-gray-300">
                Supervisor Designation
              </Label>
              <Input
                id="supervisorDesignation"
                name="supervisorDesignation"
                value={formData.supervisorDesignation}
                onChange={handleChange}
                placeholder="e.g., Zonal Head - Collections"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- SUBMIT BUTTON --- */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-rose-800 hover:bg-rose-900 text-white dark:bg-rose-700 dark:hover:bg-rose-600"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </form>
  );
};
