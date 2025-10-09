"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

// Define a type for a single branch
type Branch = {
  id: number;
  personName: string;
  address: string;
  contact: string;
  email: string;
};

export function BranchDetailsManager() {
  const [branches, setBranches] = useState<Branch[]>([]);

  const addNewBranch = () => {
    const newBranch: Branch = {
      id: Date.now(), // Use a simple unique ID
      personName: "",
      address: "",
      contact: "",
      email: "",
    };
    setBranches([...branches, newBranch]);
  };

  const removeBranch = (id: number) => {
    setBranches(branches.filter((branch) => branch.id !== id));
  };

  const handleInputChange = (
    id: number,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    const updatedBranches = branches.map((branch) =>
      branch.id === id ? { ...branch, [name]: value } : branch
    );
    setBranches(updatedBranches);
  };

  return (
    <div className="space-y-8">
      {branches.map((branch, index) => (
        <div
          key={branch.id}
          className="p-6 border rounded-lg relative space-y-6"
        >
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-lg text-neutral-700">
              Branch #{index + 1}
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeBranch(branch.id)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Remove
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`personName-${branch.id}`}>
                Authorised Branch Person
              </Label>
              <Input
                id={`personName-${branch.id}`}
                name="personName"
                value={branch.personName}
                onChange={(e) => handleInputChange(branch.id, e)}
                placeholder="Enter authorised person's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contact-${branch.id}`}>Branch Contact No.</Label>
              <Input
                id={`contact-${branch.id}`}
                name="contact"
                value={branch.contact}
                onChange={(e) => handleInputChange(branch.id, e)}
                placeholder="Enter branch contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`email-${branch.id}`}>Email ID</Label>
              <Input
                id={`email-${branch.id}`}
                name="email"
                type="email"
                value={branch.email}
                onChange={(e) => handleInputChange(branch.id, e)}
                placeholder="Enter branch email address"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`address-${branch.id}`}>Branch Address</Label>
              <Textarea
                id={`address-${branch.id}`}
                name="address"
                value={branch.address}
                onChange={(e) => handleInputChange(branch.id, e)}
                placeholder="Enter full branch address"
                rows={3}
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addNewBranch}>
        + Add New Branch
      </Button>
    </div>
  );
}