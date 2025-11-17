"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getAgencyProfileAction,
  updateAgencyProfileAction,
} from "@/actions/agency-profile.action";
import { toast } from "sonner";
import { Loader2, Building2, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Type-safe local form shape
type BranchData = {
  id?: string;
  branchName: string;
  branchAddress: string;
  branchContact: string;
  branchEmail: string;
};

type FormData = {
  vemId: string;
  panCard: string;
  agencyName: string;
  agencyAddress: string;
  proprietorName: string;
  contactNo: string;
  email: string;
  branches: BranchData[];
};

export const AgencyProfileForm = () => {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    vemId: "",
    panCard: "",
    agencyName: "",
    agencyAddress: "",
    proprietorName: "",
    contactNo: "",
    email: "",
    branches: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getAgencyProfileAction();
      if (result.error) {
        setError(result.error);
      } else if (result.profile) {
        setFormData({
          vemId: result.profile.vemId || "",
          panCard: result.profile.panCard || "",
          agencyName: result.profile.agencyName || "",
          agencyAddress: result.profile.agencyAddress || "",
          proprietorName: result.profile.proprietorName || "",
          contactNo: result.profile.contactNo || "",
          email: result.profile.email || "",
          branches: result.profile.branches.map((b) => ({
            id: b.id,
            branchName: b.branchName,
            branchAddress: b.branchAddress,
            branchContact: b.branchContact || "",
            branchEmail: b.branchEmail || "",
          })),
        });
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchChange = (
    index: number,
    field: keyof BranchData,
    value: string
  ) => {
    setFormData((prev) => {
      const newBranches = [...prev.branches];
      newBranches[index] = { ...newBranches[index], [field]: value };
      return { ...prev, branches: newBranches };
    });
  };

  const addBranch = () => {
    setFormData((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        {
          branchName: "",
          branchAddress: "",
          branchContact: "",
          branchEmail: "",
        },
      ],
    }));
  };

  const removeBranch = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.agencyName.trim()) {
      toast.error("Agency name is required");
      return;
    }

    // Filter out empty branches
    const validBranches = formData.branches.filter(
      (b) => b.branchName.trim() && b.branchAddress.trim()
    );

    startTransition(async () => {
      const result = await updateAgencyProfileAction({
        ...formData,
        branches: validBranches,
      });
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
          <CardTitle className="dark:text-gray-100">Agency Details</CardTitle>
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
      {/* --- CARD 1: PRIMARY DETAILS --- */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Primary Details</CardTitle>
          <CardDescription>
            Update your agency&apos;s official identification and registration
            details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vemId" className="dark:text-gray-300">
                Agency VEM ID
              </Label>
              <Input
                id="vemId"
                name="vemId"
                value={formData.vemId}
                onChange={handleChange}
                placeholder="Enter VEM ID"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panCard" className="dark:text-gray-300">
                Agency PAN Card No.
              </Label>
              <Input
                id="panCard"
                name="panCard"
                value={formData.panCard}
                onChange={handleChange}
                placeholder="Enter PAN Card No."
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="agencyName" className="dark:text-gray-300">
                Agency Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agencyName"
                name="agencyName"
                value={formData.agencyName}
                onChange={handleChange}
                placeholder="Enter Agency Name"
                disabled={isPending}
                required
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="agencyAddress" className="dark:text-gray-300">
                Agency Address
              </Label>
              <Textarea
                id="agencyAddress"
                name="agencyAddress"
                value={formData.agencyAddress}
                onChange={handleChange}
                placeholder="Enter full agency address"
                rows={4}
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- CARD 2: KEY PERSON DETAILS --- */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">
            Key Person Details
          </CardTitle>
          <CardDescription>
            Provide contact details for the primary person responsible for the
            agency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="proprietorName" className="dark:text-gray-300">
                Proprietor/Partner/Director
              </Label>
              <Input
                id="proprietorName"
                name="proprietorName"
                value={formData.proprietorName}
                onChange={handleChange}
                placeholder="Enter full name"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNo" className="dark:text-gray-300">
                Contact No.
              </Label>
              <Input
                id="contactNo"
                name="contactNo"
                value={formData.contactNo}
                onChange={handleChange}
                placeholder="Enter contact"
                disabled={isPending}
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="email" className="dark:text-gray-300">
                Email ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                disabled={isPending}
                required
                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- CARD 3: BRANCH DETAILS --- */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100 flex items-center">
            <Building2 className="mr-2 h-5 w-5" /> Branch Details
          </CardTitle>
          <CardDescription>
            Add details for each branch office. Leave blank if none.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No branches added yet. Click the button below to add one.</p>
            </div>
          ) : (
            formData.branches.map((branch, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-4 dark:border-gray-700 relative"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold dark:text-gray-200">
                    Branch {index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeBranch(index)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`branchName-${index}`}
                      className="dark:text-gray-300"
                    >
                      Branch Name
                    </Label>
                    <Input
                      id={`branchName-${index}`}
                      value={branch.branchName}
                      onChange={(e) =>
                        handleBranchChange(index, "branchName", e.target.value)
                      }
                      placeholder="Enter branch name"
                      disabled={isPending}
                      className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`branchContact-${index}`}
                      className="dark:text-gray-300"
                    >
                      Branch Contact
                    </Label>
                    <Input
                      id={`branchContact-${index}`}
                      value={branch.branchContact}
                      onChange={(e) =>
                        handleBranchChange(
                          index,
                          "branchContact",
                          e.target.value
                        )
                      }
                      placeholder="Enter contact number"
                      disabled={isPending}
                      className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label
                      htmlFor={`branchAddress-${index}`}
                      className="dark:text-gray-300"
                    >
                      Branch Address
                    </Label>
                    <Textarea
                      id={`branchAddress-${index}`}
                      value={branch.branchAddress}
                      onChange={(e) =>
                        handleBranchChange(
                          index,
                          "branchAddress",
                          e.target.value
                        )
                      }
                      placeholder="Enter branch address"
                      rows={2}
                      disabled={isPending}
                      className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label
                      htmlFor={`branchEmail-${index}`}
                      className="dark:text-gray-300"
                    >
                      Branch Email
                    </Label>
                    <Input
                      id={`branchEmail-${index}`}
                      type="email"
                      value={branch.branchEmail}
                      onChange={(e) =>
                        handleBranchChange(index, "branchEmail", e.target.value)
                      }
                      placeholder="Enter branch email"
                      disabled={isPending}
                      className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <Button
            type="button"
            variant="outline"
            onClick={addBranch}
            disabled={isPending}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        </CardContent>
      </Card>

      {/* --- SUBMIT BUTTON --- */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="bg-rose-800 hover:bg-rose-900 text-white dark:bg-rose-700 dark:hover:bg-rose-600"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Agency Details
        </Button>
      </div>
    </form>
  );
};