// src/components/reports/assignment-report-client.tsx
"use client";

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Import the new tab component
import { AuditReportTab } from './audit-report-tab'; 
import { PenaltyReportTab } from './penalty-report-tab';
import type { 
  AuditAssignmentReportItem, 
  CmAssignmentReportItem,
  AuditReportItem,
  PenaltyReportItem
} from '@/actions/reports.action';

interface ReportClientProps {
  initialAuditAssignments: AuditAssignmentReportItem[];
  initialCmAssignments: CmAssignmentReportItem[];
  initialAuditReport: AuditReportItem[];
  initialPenalties: PenaltyReportItem[];
  initialMonth: number;
  initialYear: number;
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
}));

const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

export function AssignmentReportClient({
  initialAuditAssignments,
  initialCmAssignments,
  initialAuditReport,
  initialPenalties,
  initialMonth,
  initialYear
}: ReportClientProps) {
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(String(initialMonth));
  const [year, setYear] = useState(String(initialYear));
  const [penaltySearch, setPenaltySearch] = useState("");

  const handleFilterChange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    params.set('year', year);
    if (penaltySearch) {
      params.set('search', penaltySearch);
    } else {
      params.delete('search');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePenaltySearch = (query: string) => {
    setPenaltySearch(query);
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    params.set('year', year);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatus = (item: { isActive: boolean, updatedAt: Date }) => {
    const filterStartDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    if (item.isActive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    
    // If inactive, check if it was deactivated *during* this period
    if (new Date(item.updatedAt) >= filterStartDate) {
      return <Badge variant="destructive">Deactivated</Badge>;
    }
    
    return <Badge variant="destructive">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 1. Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="space-y-2">
          <label className="text-sm font-medium">Month</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Year</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleFilterChange}>Apply Filters</Button>
      </div>

      {/* 2. Tabs and Tables */}
      <Tabs defaultValue="audit-firm">
        {/* --- MODIFICATION: Added new tab --- */}
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit-firm">Audit Firm Assignments ({initialAuditAssignments.length})</TabsTrigger>
          <TabsTrigger value="cm">CM Assignments ({initialCmAssignments.length})</TabsTrigger>
          <TabsTrigger value="audits">Audits & Scorecards ({initialAuditReport.length})</TabsTrigger>
          <TabsTrigger value="penalties">Penalties ({initialPenalties.length})</TabsTrigger>
        </TabsList>
        {/* --- END MODIFICATION --- */}
        
        {/* Audit Firm Assignments Tab */}
        <TabsContent value="audit-firm">
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Assigned To (Firm)</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialAuditAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No audit firm assignments found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  initialAuditAssignments.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.agencyName}</TableCell>
                      <TableCell>{item.firmName}</TableCell>
                      <TableCell>{item.assignedByName}</TableCell>
                      <TableCell>{formatDate(item.assignedAt)}</TableCell>
                      <TableCell>
                        {getStatus(item)}
                      </TableCell>
                      <TableCell>
                        {!item.isActive ? formatDate(item.updatedAt) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Collection Manager Assignments Tab */}
        <TabsContent value="cm">
           <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Assigned To (CM)</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCmAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No Collection Manager assignments found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  initialCmAssignments.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.agencyName}</TableCell>
                      <TableCell>{item.cmName}</TableCell>
                      <TableCell>{item.assignedByName}</TableCell>
                      <TableCell>{formatDate(item.assignedAt)}</TableCell>
                      <TableCell>
                        {getStatus(item)}
                      </TableCell>
                      <TableCell>
                        {!item.isActive ? formatDate(item.updatedAt) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* --- NEW TAB CONTENT --- */}
        <TabsContent value="audits">
          <AuditReportTab audits={initialAuditReport} />
        </TabsContent>
        {/* --- END NEW TAB CONTENT --- */}
        
        {/* Penalties Tab */}
        <TabsContent value="penalties">
          <PenaltyReportTab penalties={initialPenalties} onSearch={handlePenaltySearch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}