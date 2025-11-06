// src/components/audit/AuditorDashboardClient.tsx
"use client";

import React, { useState, useMemo, useTransition } from "react";
import { AgencyAssignment, User } from "@/generated/prisma";
import { AssignedAgencyCard } from "./AssignedAgencyCard";
import { markAssignmentAsViewedAction } from "@/actions/auditor.action";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

// Update type to include the full assignment object
type AssignmentWithAgency = (AgencyAssignment & {
  agency: Pick<User, "id" | "name" | "email" | "image">;
});

interface AuditorDashboardClientProps {
  assignments: AssignmentWithAgency[];
  firmName: string;
}

export const AuditorDashboardClient = ({ 
  assignments, 
  firmName 
}: AuditorDashboardClientProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Memoize the new assignments to drive the banner
  const newAssignments = useMemo(() => {
    return assignments.filter(a => a.viewedByAt === null);
  }, [assignments]);

  const handleCardClick = (assignment: AssignmentWithAgency) => {
    // Show spinner on the specific card
    setViewingId(assignment.id);
    
    startTransition(async () => {
      // Only mark as viewed if it's new
      if (assignment.viewedByAt === null) {
        const result = await markAssignmentAsViewedAction(assignment.id);
        if (result.error) {
          toast.error(result.error);
          setViewingId(null);
          return;
        }
      }
      // Navigate to the agency page
      router.push(`/auditor/agencies/${assignment.agency.id}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* --- NEW ASSIGNMENT BANNER --- */}
      {newAssignments.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/30">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">
            {newAssignments.length} New Assignment{newAssignments.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-200">
            You have {newAssignments.length} new {newAssignments.length > 1 ? 'agencies' : 'agency'} assigned to your firm.
            They are highlighted below.
          </AlertDescription>
        </Alert>
      )}

      {/* Agency List */}
      <h2 className="text-2xl font-semibold">Assigned Agencies</h2>
      {assignments.length === 0 ? (
        <p className="text-muted-foreground">You have no agencies assigned to your firm yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(assignment => (
            <AssignedAgencyCard 
              key={assignment.id} 
              assignment={assignment}
              isNew={assignment.viewedByAt === null}
              isLoading={viewingId === assignment.id}
              onClick={() => handleCardClick(assignment)}
            />
          ))}
        </div>
      )}
    </div>
  );
};