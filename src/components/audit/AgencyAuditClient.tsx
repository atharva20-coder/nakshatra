// src/components/audit/AgencyAuditClient.tsx
"use client";

import { createNewAuditAction } from "@/actions/auditor.action";
import { Audit, AuditScorecard, Auditor, User } from "@/generated/prisma";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { Badge } from "../ui/badge";

type AuditWithRelations = (Audit & {
  auditor: { user: { name: string | null } };
  scorecard: AuditScorecard | null;
});

interface AgencyAuditClientProps {
  agency: Pick<User, "id" | "name" | "email">;
  audits: AuditWithRelations[];
}

export const AgencyAuditClient = ({ agency, audits }: AgencyAuditClientProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStartNewAudit = () => {
    if (!confirm("Are you sure you want to start a new audit for this agency?")) {
      return;
    }

    startTransition(async () => {
      const result = await createNewAuditAction(agency.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("New audit created. Redirecting...");
        router.push(`/auditor/agencies/${agency.id}/audit/${result.newAudit!.id}`);
      }
    });
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{agency.name}</h1>
          <p className="text-muted-foreground">{agency.email}</p>
        </div>
        <Button onClick={handleStartNewAudit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Start New Audit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>View past and ongoing audits for {agency.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-muted-foreground">No audits have been started for this agency yet.</p>
          ) : (
            <div className="space-y-4">
              {audits.map(audit => (
                <Link
                  key={audit.id}
                  href={`/auditor/agencies/${agency.id}/audit/${audit.id}`}
                  className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">
                        Audit on {new Date(audit.auditDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Conducted by: {audit.auditor.user.name || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {audit.scorecard && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                                Scorecard Published
                            </Badge>
                        )}
                        <Badge variant="outline">{audit.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};