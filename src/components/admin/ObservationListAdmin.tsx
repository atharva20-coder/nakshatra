"use client";

import React, { useState } from "react";
import { 
  Audit, 
  Observation, 
  Penalty,
  ObservationStatus,
  ShowCauseNotice
} from "@/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueSCNModal } from "./IssueSCNModal";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

// Define the complex type for the prop
type AuditWithRelations = Audit & {
  agency: { id: string; name: string };
  firm: { name: string } | null;
  auditor: ({ user: { name: string } | null }) | null;
  observations: (Observation & { penalty: Penalty | null; showCauseNotice: { id: string; subject: string } | null })[];
};

interface ObservationListAdminProps {
  initialAudit: AuditWithRelations;
}

export function ObservationListAdmin({ initialAudit }: ObservationListAdminProps) {
  const [selectedObservationIds, setSelectedObservationIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleObservation = (id: string) => {
    setSelectedObservationIds(prev =>
      prev.includes(id) ? prev.filter(obsId => obsId !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: ObservationStatus) => {
    switch (status) {
      case "PENDING_ADMIN_REVIEW":
        return <Badge variant="outline">Pending Review</Badge>;
      case "SENT_TO_AGENCY":
        return <Badge className="bg-yellow-100 text-yellow-800">Sent to Agency</Badge>;
      case "AGENCY_ACCEPTED":
        return <Badge className="bg-green-100 text-green-800">Agency Accepted</Badge>;
      case "AGENCY_DISPUTED":
        return <Badge className="bg-red-100 text-red-800">Agency Disputed</Badge>;
      case "CLOSED":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  // Filter for observations that can be added to a *new* SCN
  const issuableObservations = initialAudit.observations.filter(
    obs => obs.status === "PENDING_ADMIN_REVIEW"
  );
  
  // Observations that are already part of an SCN or closed
  const otherObservations = initialAudit.observations.filter(
    obs => obs.status !== "PENDING_ADMIN_REVIEW"
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Audit Observations</CardTitle>
              <CardDescription>
                Audit for <span className="font-semibold text-primary">{initialAudit.agency.name}</span>
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Auditor: {initialAudit.auditor?.user?.name || "N/A"}</p>
              <p>Firm: {initialAudit.firm?.name || "N/A"}</p>
              <p>Date: {new Date(initialAudit.auditDate).toLocaleDateString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Observations Pending Review</h3>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  disabled={selectedObservationIds.length === 0}
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Issue Show Cause Notice ({selectedObservationIds.length})
                </Button>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Obs. #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuableObservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No new observations pending review.
                        </TableCell>
                      </TableRow>
                    ) : (
                      issuableObservations.map(obs => (
                        <TableRow key={obs.id}>
                          <TableCell>
                            <Checkbox
                              id={obs.id}
                              checked={selectedObservationIds.includes(obs.id)}
                              onCheckedChange={() => toggleObservation(obs.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono">{obs.observationNumber}</TableCell>
                          <TableCell className="max-w-md">{obs.description}</TableCell>
                          <TableCell>
                            <Badge variant={obs.severity === "HIGH" || obs.severity === "CRITICAL" ? "destructive" : "secondary"}>
                              {obs.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(obs.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Read-only list of other observations */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Processed Observations</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obs. #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SCN Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherObservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No processed observations.
                        </TableCell>
                      </TableRow>
                    ) : (
                      otherObservations.map(obs => (
                        <TableRow key={obs.id} className="bg-gray-50/50 dark:bg-gray-800/20">
                          <TableCell className="font-mono">{obs.observationNumber}</TableCell>
                          <TableCell className="max-w-md">{obs.description}</TableCell>
                          <TableCell>{getStatusBadge(obs.status)}</TableCell>
                          <TableCell>
                            {obs.showCauseNotice ? (
                              <Button variant="link" size="sm" asChild>
                                <Link href={`/admin/show-cause/${obs.showCauseNotice.id}`}>
                                  {obs.showCauseNotice.subject}
                                </Link>
                              </Button>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* The Modal */}
      <IssueSCNModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agencyId={initialAudit.agency.id}
        observationIds={selectedObservationIds}
      />
    </>
  );
}