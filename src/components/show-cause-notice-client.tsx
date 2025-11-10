"use client";

import React, { useState } from "react";
import { 
  ShowCauseNotice, 
  Observation, 
  Penalty, 
  ShowCauseResponse,
  ShowCauseStatus,
  ObservationStatus,
  Audit,
  AuditingFirm,
  Auditor,
  User
} from "@/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { respondToObservationAction } from "@/actions/audit-management.action";
import { Loader2, AlertTriangle, File as FileIcon, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { assignPenaltyAction } from "@/actions/audit-management.action"; // For Admin
import { closeShowCauseNoticeAction } from "@/actions/show-cause-notice.action"; // For Admin
import { Input } from "@/components/ui/input";
import { uploadEvidenceAction } from "@/actions/upload-evidence.action"; // For Agency

// --- This is the complex type for the `notice` prop, including the fix ---
type ObservationWithAuditDetails = Observation & {
  penalty: Penalty | null;
  audit: Audit & {
    firm: { name: string } | null;
    auditor: Auditor & {
      user: { name: string } | null;
    } | null;
  } | null;
};

type NoticeWithRelations = ShowCauseNotice & {
  adminRemarks?: string | null; // added
  issuedByAdmin: { name: string | null } | null;
  receivedByAgency: { name: string | null } | null;
  observations: ObservationWithAuditDetails[];
  responses: (ShowCauseResponse & { author: { name: string | null } | null })[];
};

// --- End of complex type ---

interface ShowCauseNoticeClientProps {
  notice: NoticeWithRelations;
  isAgencyView: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function ShowCauseNoticeClient({ notice, isAgencyView }: ShowCauseNoticeClientProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [selectedObs, setSelectedObs] = useState<ObservationWithAuditDetails | null>(null);
  const [justification, setJustification] = useState("");
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);

  // --- Agency File Upload State ---
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Admin State ---
  const [penaltyModalObs, setPenaltyModalObs] = useState<ObservationWithAuditDetails | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyReason, setPenaltyReason] = useState("");
  const [deductionMonth, setDeductionMonth] = useState("");
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState(notice.adminRemarks || "");

  const getStatusBadge = (status: ShowCauseStatus) => {
    switch (status) {
      case "ISSUED": return <Badge className="bg-yellow-100 text-yellow-800">Issued (Awaiting Response)</Badge>;
      case "RESPONDED": return <Badge className="bg-blue-100 text-blue-800">Responded (Under Review)</Badge>;
      case "CLOSED": return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getObservationStatus = (obs: Observation) => {
    if (obs.penaltyId) return <Badge className="bg-purple-100 text-purple-800">Penalty Issued</Badge>;
    switch (obs.status) {
      case "SENT_TO_AGENCY": return <Badge variant="outline">Pending Response</Badge>;
      case "AGENCY_ACCEPTED": return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case "AGENCY_DISPUTED": return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
      case "CLOSED": return <Badge variant="secondary">Closed</Badge>;
      case "AUTO_ACCEPTED": return <Badge className="bg-yellow-100 text-yellow-800">Auto-Accepted</Badge>;
      default: return <Badge variant="secondary">{obs.status}</Badge>;
    }
  };

  const openRespondModal = (obs: ObservationWithAuditDetails) => {
    if (!isAgencyView || obs.status !== 'SENT_TO_AGENCY' || notice.status !== 'ISSUED') return;
    setSelectedObs(obs);
    setIsAccepted(null);
    setJustification("");
    setFile(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`File is too large. Max size is 5MB.`);
        setFile(null);
        e.target.value = ""; // Clear the input
      } else {
        setFile(selectedFile);
      }
    }
  };

  const handleResponseSubmit = async () => {
    if (isAccepted === null) {
      toast.error("You must Confirm or Deny the observation."); return;
    }
    if (isAccepted === false && !justification.trim()) {
      toast.error("Justification is required if you deny the observation."); return;
    }
    if (isAccepted === false && selectedObs?.evidenceRequired && !file) {
      toast.error("Evidence is required to dispute this observation. Please upload a file.");
      return;
    }

    setIsPending(true);
    let uploadedPath: string | undefined = undefined;

    if (isAccepted === false && file) {
      setIsUploading(true);
      toast.info("Uploading evidence...");
      const formData = new FormData();
      formData.append("evidenceFile", file);
      
      const uploadResult = await uploadEvidenceAction(formData);
      
      setIsUploading(false);
      if (uploadResult.error) {
        toast.error(uploadResult.error);
        setIsPending(false);
        return;
      }
      uploadedPath = uploadResult.url;
      toast.success("Evidence uploaded successfully.");
    }

    const result = await respondToObservationAction(
      selectedObs!.id,
      isAccepted,
      justification,
      uploadedPath
    );

    if (result.error) toast.error(result.error);
    else {
      toast.success("Response submitted for: " + selectedObs?.observationNumber);
      setSelectedObs(null);
      router.refresh();
    }
    setIsPending(false);
  };

  const handleAssignPenalty = async () => {
    if (!penaltyModalObs || penaltyAmount <= 0 || !penaltyReason || !deductionMonth) {
      toast.error("Please fill in all penalty fields."); return;
    }
    setIsPending(true);
    const result = await assignPenaltyAction({
      observationId: penaltyModalObs.id,
      penaltyAmount,
      penaltyReason,
      deductionMonth,
      correctiveAction: penaltyModalObs.agencyResponse || undefined // Can pass justification here
    });
    if (result.error) toast.error(result.error);
    else {
      toast.success("Penalty assigned successfully.");
      setPenaltyModalObs(null);
      router.refresh();
    }
    setIsPending(false);
  };
  
  const handleCloseNotice = async () => {
    if (!adminRemarks.trim()) {
      toast.error("Please provide final closing remarks."); return;
    }
    setIsPending(true);
    const result = await closeShowCauseNoticeAction(notice.id, adminRemarks);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Show Cause Notice has been closed.");
      setCloseModalOpen(false);
      router.refresh();
    }
    setIsPending(false);
  };

  const allObservationsHandled = notice.observations.every(
    obs => obs.status !== 'SENT_TO_AGENCY' && obs.status !== 'AWAITING_AGENCY_RESPONSE'
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{notice.subject}</CardTitle>
              <CardDescription className="mt-2">
                Issued by: {notice.issuedByAdmin?.name || "N/A"} | 
                Due Date: {new Date(notice.responseDueDate).toLocaleDateString()}
              </CardDescription>
            </div>
            {getStatusBadge(notice.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold">Notice Details:</h4>
            <p className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded border whitespace-pre-wrap">{notice.details}</p>
          </div>

          {/* ✅ Admin Remarks section goes here */}
          <div>
            <h4 className="font-semibold mt-4">Admin Remarks:</h4>
            {notice?.adminRemarks ? (
              <p className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded border whitespace-pre-wrap">
                {notice.adminRemarks}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No admin remarks yet.
              </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold">Observations:</h4>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obs. #</TableHead>
                    <TableHead>Observation</TableHead>
                    <TableHead>Auditor Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agency Justification</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notice.observations.map(obs => (
                    <TableRow key={obs.id}>
                      <TableCell className="font-mono">{obs.observationNumber}</TableCell>
                      <TableCell className="max-w-sm whitespace-pre-wrap">
                        <p>{obs.description}</p>
                        <Badge variant={obs.severity === 'HIGH' || obs.severity === 'CRITICAL' ? 'destructive' : 'secondary'} className="mt-2">
                          {obs.severity}
                        </Badge>
                      </TableCell>
                      
                      {/* --- ADMIN VISIBILITY FIX - DISPLAYING INFO --- */}
                      <TableCell className="text-xs">
                        <p><strong>Firm:</strong> {obs.audit?.firm?.name || 'N/A'}</p>
                        <p><strong>Auditor:</strong> {obs.audit?.auditor?.user?.name || 'N/A'}</p>
                        <p><strong>On:</strong> {new Date(obs.createdAt).toLocaleDateString()}</p>
                      </TableCell>
                      {/* --- END FIX --- */}

                      <TableCell>{getObservationStatus(obs)}</TableCell>
                      <TableCell className="max-w-xs text-xs italic text-gray-600">
                        {obs.agencyResponse || "---"}
                      </TableCell>
                      <TableCell>
                        {obs.evidencePath ? (
                          <Button variant="link" size="sm" asChild>
                            <a href={obs.evidencePath} target="_blank" rel="noopener noreferrer" title={obs.evidencePath}>
                              <LinkIcon className="h-4 w-4 mr-1" />
                              View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAgencyView && obs.status === 'SENT_TO_AGENCY' && notice.status === 'ISSUED' && (
                          <Button size="sm" onClick={() => openRespondModal(obs)}>Respond</Button>
                        )}
                        {!isAgencyView && (obs.status === 'AGENCY_ACCEPTED' || obs.status === 'AUTO_ACCEPTED' || obs.status === 'AGENCY_DISPUTED') && !obs.penaltyId && (
                          <Button size="sm" variant="destructive" onClick={() => setPenaltyModalObs(obs)}>Assign Penalty</Button>
                        )}
                        {!isAgencyView && obs.status === 'AGENCY_DISPUTED' && !obs.penaltyId && (
                          <AlertTriangle className="h-5 w-5 text-red-500 ml-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
        </CardContent>
        {!isAgencyView && notice.status !== 'CLOSED' && (
          <CardFooter className="border-t pt-6">
            <div className="w-full space-y-4">
              <h4 className="font-semibold">Admin Actions</h4>
              <Label htmlFor="adminRemarks">Final Remarks</Label>
              <Textarea 
                id="adminRemarks" 
                placeholder="Add closing remarks here..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
              />
              <Button 
                onClick={handleCloseNotice} 
                disabled={!allObservationsHandled || isPending}
                title={allObservationsHandled ? "Close this notice" : "Cannot close: Observations are still pending agency response."}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Close Show Cause Notice"}
              </Button>
              {!allObservationsHandled && (
                <p className="text-xs text-red-600">
                  You can only close this notice once all observations have been accepted, disputed, or penalized.
                </p>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Agency: Response Dialog */}
      <Dialog open={!!selectedObs} onOpenChange={() => setSelectedObs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Observation: {selectedObs?.observationNumber}</DialogTitle>
            <DialogDescription>{selectedObs?.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <RadioGroup value={isAccepted === null ? "" : (isAccepted ? "yes" : "no")} onValueChange={(val) => setIsAccepted(val === "yes")}>
              <Label>Do you confirm and accept this observation?</Label>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="r-yes" />
                <Label htmlFor="r-yes" className="font-normal">Yes, I confirm this observation.</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="r-no" />
                <Label htmlFor="r-no" className="font-normal">No, I deny/dispute this observation.</Label>
              </div>
            </RadioGroup>
            
            {isAccepted === false && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="justification">Justification (Required if denying)</Label>
                  <Textarea 
                    id="justification" 
                    rows={5}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Please provide a detailed explanation and any evidence references..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="evidenceFile">
                    Supporting Evidence (Max 5MB)
                    {selectedObs?.evidenceRequired && <span className="text-red-500">* (Required)</span>}
                  </Label>
                  <Input
                    id="evidenceFile"
                    type="file"
                    onChange={handleFileChange}
                    className="file:text-sm file:font-medium"
                  />
                  {file && (
                    <p className="text-xs text-green-600 flex items-center">
                      <FileIcon className="h-3 w-3 mr-1" /> Ready to upload: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedObs(null)}>Cancel</Button>
            <Button onClick={handleResponseSubmit} disabled={isPending || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isUploading ? "Uploading..." : (isPending ? "Submitting..." : "Submit Response")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Admin: Assign Penalty Dialog */}
      <Dialog open={!!penaltyModalObs} onOpenChange={() => setPenaltyModalObs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Penalty for: {penaltyModalObs?.observationNumber}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="penaltyAmount">Penalty Amount (₹)</Label>
              <Input id="penaltyAmount" type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductionMonth">Deduction Month</Label>
              <Input id="deductionMonth" type="text" placeholder="e.g., Nov-2025" value={deductionMonth} onChange={(e) => setDeductionMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltyReason">Penalty Reason</Label>
              <Textarea id="penaltyReason" value={penaltyReason} onChange={(e) => setPenaltyReason(e.target.value)} placeholder="Reason for the penalty..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPenaltyModalObs(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleAssignPenalty} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Penalty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Close Notice Dialog */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Show Cause Notice?</DialogTitle>
            <DialogDescription>
              This will finalize the notice. Add any closing remarks.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="adminRemarksClose">Final Remarks</Label>
            <Textarea id="adminRemarksClose" value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCloseNotice} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default ShowCauseNoticeClient;
