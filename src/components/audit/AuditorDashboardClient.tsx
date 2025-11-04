// src/components/audit/AuditorDashboardClient.tsx
"use client";

import React from "react";
import { AgencyAssignment, User } from "@/generated/prisma";
import { AssignedAgencyCard } from "./AssignedAgencyCard";

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

  return (
    <div className="space-y-6">
      {/* "New Assignment" logic removed as 'viewedByAt' is not in the schema */}

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
            />
          ))}
        </div>
      )}
    </div>
  );
};