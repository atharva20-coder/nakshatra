// src/components/audit/assign-agency-form.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { assignAgencyToFirmAction } from '@/actions/audit-management.action';
import { toast } from 'sonner';
import { Loader2, LinkIcon } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
}

interface Firm {
  id: string;
  name: string;
}

interface AssignAgencyFormProps {
  agencies: Agency[];
  firms: Firm[];
}

export function AssignAgencyForm({ agencies, firms }: AssignAgencyFormProps) {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedFirmId, setSelectedFirmId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAgencyId || !selectedFirmId) {
      toast.error('Please select both an agency and an auditing firm.');
      return;
    }

    setIsSubmitting(true);
    const result = await assignAgencyToFirmAction(selectedAgencyId, selectedFirmId);
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Successfully assigned agency to ${result.assignment?.firm.name}!`);
      // Optionally reset form, but maybe better to keep values for assigning multiple
      // setSelectedAgencyId('');
      // setSelectedFirmId('');
      // Consider triggering a refresh of the parent page list if needed
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Agency to Auditing Firm</CardTitle>
        <CardDescription>
          Select an agency and the auditing firm responsible for its audits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            {/* Agency Selection */}
            <div className="space-y-2">
              <label htmlFor="agency-select" className="text-sm font-medium">Agency</label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId} required>
                <SelectTrigger id="agency-select">
                  <SelectValue placeholder="Select an agency..." />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Firm Selection */}
            <div className="space-y-2">
               <label htmlFor="firm-select" className="text-sm font-medium">Auditing Firm</label>
              <Select value={selectedFirmId} onValueChange={setSelectedFirmId} required>
                <SelectTrigger id="firm-select">
                  <SelectValue placeholder="Select a firm..." />
                </SelectTrigger>
                <SelectContent>
                  {firms.map((firm) => (
                    <SelectItem key={firm.id} value={firm.id}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !selectedAgencyId || !selectedFirmId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" /> Assign Agency
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}