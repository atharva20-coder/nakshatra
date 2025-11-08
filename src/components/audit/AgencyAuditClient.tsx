// src/components/audit/AgencyAuditClient.tsx
"use client";

import { createNewAuditAction } from "@/actions/auditor.action";
import { Audit, AuditScorecard, Auditor, User } from "@/generated/prisma";
import { useRouter } from "next/navigation";
import React, { useTransition, useState } from "react"; // <-- Import useState
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { Badge } from "../ui/badge";
// --- ADD NEW IMPORTS ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// --- END NEW IMPORTS ---

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
  
  // --- ADD NEW STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auditorName, setAuditorName] = useState("");
  const [auditorEmpId, setAuditorEmpId] = useState("");
  // --- END NEW STATE ---

  const handleStartNewAudit = () => {
    // Just open the modal
    setIsModalOpen(true);
  };

  const handleConfirmCreateAudit = () => {
    if (!auditorName || !auditorEmpId) {
      toast.error("Please enter the auditor's name and employee ID.");
      return;
    }

    startTransition(async () => {
      const result = await createNewAuditAction(agency.id, auditorName, auditorEmpId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("New audit created. Redirecting...");
        // Reset form and close modal
        setAuditorName("");
        setAuditorEmpId("");
        setIsModalOpen(false);
        router.push(`/auditor/agencies/${agency.id}/audit/${result.newAudit!.id}`);
      }
    });
  };

  return (
    <>
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
                    href={`/auditor/audit/${audit.id}`}
                    className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          Audit on {new Date(audit.auditDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Conducted by: {audit.auditorName || "N/A"}
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
      
      {/* --- ADD NEW DIALOG COMPONENT --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start New Audit</DialogTitle>
            <DialogDescription>
              Enter the details of the individual conducting this audit for {agency.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="auditorName" className="text-right">
                Auditor Name
              </Label>
              <Input
                id="auditorName"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="col-span-3"
                disabled={isPending}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="auditorEmpId" className="text-right">
                Employee ID
              </Label>
              <Input
                id="auditorEmpId"
                value={auditorEmpId}
                onChange={(e) => setAuditorEmpId(e.target.value)}
                className="col-span-3"
                disabled={isPending}
                placeholder="e.g., A-12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateAudit} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --- END NEW DIALOG COMPONENT --- */}
    </>
  );
};