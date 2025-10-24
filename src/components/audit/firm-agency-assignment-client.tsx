// src/components/audit/firm-agency-assignment-client.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox"; // Assuming you have a Checkbox component from shadcn/ui
import { updateFirmAssignmentsAction } from '@/actions/audit-management.action';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AgencyWithStatus {
    id: string;
    name: string;
    email: string;
    isAssigned: boolean;
    isAssignedToCurrentFirm: boolean;
    assignedFirmName: string | null;
}

interface FirmAgencyAssignmentClientProps {
  firm: { id: string; name: string };
  agencies: AgencyWithStatus[];
}

export function FirmAgencyAssignmentClient({ firm, agencies }: FirmAgencyAssignmentClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Initialize checked state from the server-provided data
  const [checkedAgencies, setCheckedAgencies] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    agencies.forEach(agency => {
        if (agency.isAssignedToCurrentFirm) {
            initialState[agency.id] = true;
        }
    });
    return initialState;
  });

  const handleCheckboxChange = (agencyId: string, isChecked: boolean) => {
    setCheckedAgencies(prev => ({ ...prev, [agencyId]: isChecked }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
        const initialAssignedIds = agencies
            .filter(a => a.isAssignedToCurrentFirm)
            .map(a => a.id);

        const currentAssignedIds = Object.keys(checkedAgencies).filter(id => checkedAgencies[id]);

        const idsToAssign = currentAssignedIds.filter(id => !initialAssignedIds.includes(id));
        const idsToUnassign = initialAssignedIds.filter(id => !currentAssignedIds.includes(id));

        if (idsToAssign.length === 0 && idsToUnassign.length === 0) {
            toast.info("No changes to save.");
            return;
        }

        const result = await updateFirmAssignmentsAction(firm.id, idsToAssign, idsToUnassign);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Assignments updated successfully!");
            router.refresh(); // Refresh server component data
        }
    });
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Manage Agency Assignments for: {firm.name}</CardTitle>
            <CardDescription>Select the agencies to be audited by this firm. Agencies already assigned to another firm cannot be selected.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Assign</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {agencies.map(agency => {
                            const isDisabled = agency.isAssigned && !agency.isAssignedToCurrentFirm;
                            const isChecked = checkedAgencies[agency.id] || false;
                            
                            return (
                                <tr key={agency.id} className={isDisabled ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"}>
                                    <td className="px-6 py-4">
                                        <Checkbox
                                            id={`agency-${agency.id}`}
                                            checked={isChecked}
                                            disabled={isDisabled || isPending}
                                            onCheckedChange={(checked) => handleCheckboxChange(agency.id, !!checked)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agency.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agency.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {isDisabled ? `Assigned to ${agency.assignedFirmName}` : (isChecked ? 'Assigned to this firm' : 'Available')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
             <div className="flex justify-end mt-6">
                <Button onClick={handleSubmit} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}

