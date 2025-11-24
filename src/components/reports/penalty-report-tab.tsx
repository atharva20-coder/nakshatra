"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { PenaltyReportItem } from '@/actions/reports.action';

interface PenaltyReportTabProps {
  penalties: PenaltyReportItem[];
  onSearch: (query: string) => void;
}

export function PenaltyReportTab({ penalties, onSearch }: PenaltyReportTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'ACKNOWLEDGED':
        return <Badge className="bg-green-100 text-green-800">Acknowledged</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by agency name or VEM ID..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency Name</TableHead>
              <TableHead>VEM ID</TableHead>
              <TableHead>Observation #</TableHead>
              <TableHead>Penalty Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Deduction Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {penalties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No penalties found for this period.
                </TableCell>
              </TableRow>
            ) : (
              penalties.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.agencyName}</TableCell>
                  <TableCell>{item.vemId || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-sm">{item.observationNumber}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(item.penaltyAmount)}</TableCell>
                  <TableCell className="max-w-xs truncate" title={item.penaltyReason}>
                    {item.penaltyReason}
                  </TableCell>
                  <TableCell>{item.deductionMonth}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>{formatDate(item.assignedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
