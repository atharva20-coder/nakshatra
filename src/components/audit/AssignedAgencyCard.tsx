// src/components/audit/AssignedAgencyCard.tsx
"use client";

import React from "react";
import { AgencyAssignment, User } from "@/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type AssignmentWithAgency = (AgencyAssignment & {
  agency: Pick<User, "id" | "name" | "email" | "image">;
});

interface AssignedAgencyCardProps {
  assignment: AssignmentWithAgency;
}

export const AssignedAgencyCard = ({ assignment }: AssignedAgencyCardProps) => {

  return (
    <Link
      href={`/auditor/agencies/${assignment.agency.id}`}
      className="block rounded-lg border transition-all"
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar>
            <AvatarImage src={assignment.agency.image || undefined} />
            <AvatarFallback>{assignment.agency.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle>{assignment.agency.name}</CardTitle>
            <CardDescription>{assignment.agency.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>View Details</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};