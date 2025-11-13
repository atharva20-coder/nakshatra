// src/components/admin/BulkSCNClient.tsx
"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
  // Add Info import at the top
import { 
  AlertTriangle, 
  Building2, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight, 
  Info,
  Loader2, 
  Send, 
  Users,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { issueBulkShowCauseNoticesAction } from "@/actions/bulk-scn.action";
import { useRouter } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Observation {
  id: string;
  observationNumber: string;
  category: string;
  severity: string;
  description: string;
  createdAt: Date;
  audit: {
    agency: { id: string; name: string; email: string };
    firm: { name: string } | null;
    auditor: { user: { name: string | null } | null };
  };
}

interface AgencyData {
  agency: { id: string; name: string; email: string };
  observations: Observation[];
  totalObservations: number;
  highSeverityCount: number;
  criticalSeverityCount: number;
}

interface BulkSCNClientProps {
  agencies: AgencyData[];
}

export function BulkSCNClient({ agencies }: BulkSCNClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  // Selection state
  const [selectedAgencies, setSelectedAgencies] = useState<Set<string>>(new Set());
  const [selectedObservations, setSelectedObservations] = useState<Map<string, Set<string>>>(new Map());
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());

  // Pagination state for large agency lists
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
  const agenciesPerPage = 20;

  // Results state
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    issued: Array<{ agencyId: string; noticeId: string; agencyName: string }>;
    errors: Array<{ agencyId: string; error: string }>;
  } | null>(null);

  // Filter agencies by search
  const filteredAgencies = searchFilter.trim() 
    ? agencies.filter(a => 
        a.agency.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.agency.email.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : agencies;

  // Paginate
  const totalPages = Math.ceil(filteredAgencies.length / agenciesPerPage);
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * agenciesPerPage,
    currentPage * agenciesPerPage
  );

  const toggleAgency = (agencyId: string) => {
    const newSet = new Set(selectedAgencies);
    if (newSet.has(agencyId)) {
      newSet.delete(agencyId);
      // Also remove all observations for this agency
      const newObsMap = new Map(selectedObservations);
      newObsMap.delete(agencyId);
      setSelectedObservations(newObsMap);
    } else {
      newSet.add(agencyId);
    }
    setSelectedAgencies(newSet);
  };

  const toggleObservation = (agencyId: string, observationId: string) => {
    const newMap = new Map(selectedObservations);
    const agencyObs = newMap.get(agencyId) || new Set();
    
    if (agencyObs.has(observationId)) {
      agencyObs.delete(observationId);
    } else {
      agencyObs.add(observationId);
    }
    
    if (agencyObs.size === 0) {
      newMap.delete(agencyId);
    } else {
      newMap.set(agencyId, agencyObs);
    }
    
    setSelectedObservations(newMap);
  };

  const selectAllObservationsForAgency = (agencyId: string, observations: Observation[]) => {
    const newMap = new Map(selectedObservations);
    const allIds = new Set(observations.map(o => o.id));
    newMap.set(agencyId, allIds);
    setSelectedObservations(newMap);
  };

  const toggleExpanded = (agencyId: string) => {
    const newSet = new Set(expandedAgencies);
    if (newSet.has(agencyId)) {
      newSet.delete(agencyId);
    } else {
      newSet.add(agencyId);
    }
    setExpandedAgencies(newSet);
  };

  const handleSubmit = () => {
    if (!subject || !details || !dueDate) {
      toast.error("Please fill in subject, details, and due date");
      return;
    }

    if (selectedAgencies.size === 0) {
      toast.error("Please select at least one agency");
      return;
    }

    // Build selections array
    const agencySelections = Array.from(selectedAgencies).map(agencyId => ({
      agencyId,
      observationIds: Array.from(selectedObservations.get(agencyId) || new Set())
    }));

    const emptySelections = agencySelections.filter(s => s.observationIds.length === 0);
    if (emptySelections.length > 0) {
      toast.error("Please select observations for all selected agencies");
      return;
    }

    startTransition(async () => {
      const result = await issueBulkShowCauseNoticesAction({
        agencySelections: agencySelections.map(sel => ({
          agencyId: sel.agencyId,
          observationIds: sel.observationIds as string[]
        })),
        subject,
        details,
        responseDueDate: new Date(dueDate),
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        setResults({ issued: result.issued || [], errors: result.errors || [] });
        setShowResults(true);
        toast.success(`Successfully issued ${result.summary?.successful || 0} notices!`);
        
        // Reset form
        setSelectedAgencies(new Set());
        setSelectedObservations(new Map());
        setSubject("");
        setDetails("");
        setDueDate("");
      }
    });
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return <Badge className={colors[severity as keyof typeof colors] || ''}>{severity}</Badge>;
  };

  if (agencies.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium">No Pending Observations</p>
          <p className="text-muted-foreground mt-2">
            There are no observations pending admin review at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (showResults && results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Bulk Issuance Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="text-sm text-green-800 font-medium">Successfully Issued</p>
                <p className="text-3xl font-bold text-green-900">{results.issued.length}</p>
              </CardContent>
            </Card>
            {results.errors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <p className="text-sm text-red-800 font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-900">{results.errors.length}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {results.issued.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Successfully Issued Notices
              </h3>
              <div className="space-y-2">
                {results.issued.map((item) => (
                  <div key={item.noticeId} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium">{item.agencyName}</p>
                    <Button variant="link" size="sm" asChild className="p-0 h-auto text-green-700">
                      <a href={`/admin/show-cause/${item.noticeId}`}>
                        View Notice →
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                Failed Issuances
              </h3>
              <div className="space-y-2">
                {results.errors.map((item, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium text-red-900">Agency ID: {item.agencyId}</p>
                    <p className="text-sm text-red-700">{item.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={() => { setShowResults(false); setResults(null); router.refresh(); }}>
              Issue More Notices
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/audits')}>
              Back to Audits
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Bulk selection helpers
  const selectAllAgencies = () => {
    const allIds = new Set(agencies.map(a => a.agency.id));
    setSelectedAgencies(allIds);
  };

  const deselectAllAgencies = () => {
    setSelectedAgencies(new Set());
    setSelectedObservations(new Map());
  };

  const selectAllObservationsForAllAgencies = () => {
    const newMap = new Map<string, Set<string>>();
    agencies.forEach(agencyData => {
      const allIds = new Set(agencyData.observations.map(o => o.id));
      newMap.set(agencyData.agency.id, allIds);
    });
    setSelectedObservations(newMap);
  };

  return (
    <div className="space-y-8">
      {/* SCN Form */}
      <Card>
        <CardHeader>
          <CardTitle>Show Cause Notice Details</CardTitle>
          <CardDescription>
            These details will be used for all selected agencies (supports bulk issuance to 700+ agencies)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Notice for October 2025 Audit Findings"
              disabled={isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Details / Instructions *</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide a brief overview and any instructions for the agencies..."
              rows={5}
              disabled={isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dueDate">Response Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agency Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Agencies & Observations
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAgencies.size} of {agencies.length} agencies selected
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllAgencies}
                disabled={isPending || selectedAgencies.size === agencies.length}
              >
                Select All {agencies.length} Agencies
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllObservationsForAllAgencies}
                disabled={isPending || selectedAgencies.size === 0}
              >
                Select All Observations
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllAgencies}
                disabled={isPending || selectedAgencies.size === 0}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Info Banner */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Bulk Operations:</strong> This system supports issuing SCNs to all {agencies.length} agencies at once. 
              Each agency receives their own individual SCN with their selected observations. 
              Use &ldquo;Select All&rdquo; buttons for maximum efficiency.
            </AlertDescription>
          </Alert>

          {/* Search Filter */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <Input
              placeholder="Search agencies by name or email..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="flex-1"
            />
            <Badge variant="outline">
              Showing {paginatedAgencies.length} of {filteredAgencies.length}
            </Badge>
          </div>

          {paginatedAgencies.map((agencyData) => {
            const isSelected = selectedAgencies.has(agencyData.agency.id);
            const isExpanded = expandedAgencies.has(agencyData.agency.id);
            const selectedObs = selectedObservations.get(agencyData.agency.id) || new Set();

            return (
              <Card key={agencyData.agency.id} className={isSelected ? 'border-blue-500 border-2' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      id={`agency-${agencyData.agency.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleAgency(agencyData.agency.id)}
                      disabled={isPending}
                    />
                    <div className="flex-1">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(agencyData.agency.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label 
                              htmlFor={`agency-${agencyData.agency.id}`}
                              className="font-semibold text-lg cursor-pointer flex items-center gap-2"
                            >
                              <Building2 className="h-5 w-5" />
                              {agencyData.agency.name}
                            </label>
                            <p className="text-sm text-muted-foreground">{agencyData.agency.email}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">
                                {agencyData.totalObservations} Total
                              </Badge>
                              {agencyData.criticalSeverityCount > 0 && (
                                <Badge className="bg-red-100 text-red-800">
                                  {agencyData.criticalSeverityCount} Critical
                                </Badge>
                              )}
                              {agencyData.highSeverityCount > 0 && (
                                <Badge className="bg-orange-100 text-orange-800">
                                  {agencyData.highSeverityCount} High
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent className="mt-4">
                          {isSelected && (
                            <>
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-sm font-medium">
                                  {selectedObs.size} of {agencyData.observations.length} observations selected
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => selectAllObservationsForAgency(agencyData.agency.id, agencyData.observations)}
                                  disabled={isPending}
                                >
                                  Select All
                                </Button>
                              </div>

                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>Obs. #</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Auditor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {agencyData.observations.map((obs) => (
                                    <TableRow key={obs.id}>
                                      <TableCell>
                                        <Checkbox
                                          checked={selectedObs.has(obs.id)}
                                          onCheckedChange={() => toggleObservation(agencyData.agency.id, obs.id)}
                                          disabled={isPending}
                                        />
                                      </TableCell>
                                      <TableCell className="font-mono">{obs.observationNumber}</TableCell>
                                      <TableCell>{getSeverityBadge(obs.severity)}</TableCell>
                                      <TableCell className="max-w-md truncate">{obs.description}</TableCell>
                                      <TableCell className="text-xs">
                                        <p>{obs.audit.firm?.name || 'N/A'}</p>
                                        <p className="text-muted-foreground">
                                          {obs.audit.auditor?.user?.name || 'N/A'}
                                        </p>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isPending}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isPending}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">Ready to Issue Notices?</p>
              <p className="text-sm text-muted-foreground">
                {selectedAgencies.size} agencies selected with{' '}
                {Array.from(selectedObservations.values()).reduce((sum, set) => sum + set.size, 0)} total observations
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isPending || selectedAgencies.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Issuing Notices...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Issue {selectedAgencies.size} Notice{selectedAgencies.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}