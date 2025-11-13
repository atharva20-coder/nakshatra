// src/components/audit/AssignedAgencyCard.tsx
"use client";

import React from "react";
import { AgencyAssignment, User } from "@/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

type AssignmentWithAgency = (AgencyAssignment & {
  agency: Pick<User, "id" | "name" | "email" | "image">;
});

interface AssignedAgencyCardProps {
  assignment: AssignmentWithAgency;
  isNew: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export const AssignedAgencyCard = ({ 
  assignment, 
  isNew, 
  isLoading, 
  onClick 
}: AssignedAgencyCardProps) => {

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "h-full transition-shadow cursor-pointer",
        isNew 
          ? "border-blue-500 border-2 hover:shadow-blue-100 dark:hover:shadow-blue-900/50" 
          : "hover:shadow-lg dark:hover:border-gray-700",
        isLoading && "opacity-60 cursor-wait"
      )}
    >
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={assignment.agency.image || undefined} />
          <AvatarFallback>{assignment.agency.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle>{assignment.agency.name}</CardTitle>
          <CardDescription>{assignment.agency.email}</CardDescription>
        </div>
        {isNew && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">New</Badge>}
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>View Details</span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};