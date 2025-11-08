"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AuditReportItem } from '@/actions/reports.action';
import { AuditStatus } from "@/generated/prisma";

interface AuditReportTabProps {
  audits: AuditReportItem[];
}

export function AuditReportTab({ audits }: AuditReportTabProps) {

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case AuditStatus.CLOSED:
        return <Badge className="bg-green-100 text-green-800">Closed</Badge>;
      case AuditStatus.COMPLETED:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case AuditStatus.IN_PROGRESS:
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agency</TableHead>
            <TableHead>Firm</TableHead>
            <TableHead>Auditor</TableHead>
            <TableHead>Audit Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {audits.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No audits or scorecards found for this period.
              </TableCell>
            </TableRow>
          ) : (
            audits.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.agencyName}</TableCell>
                <TableCell>{item.firmName}</TableCell>
                <TableCell>{item.auditorName}</TableCell>
                <TableCell>{formatDate(item.auditDate)}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  {item.score !== null ? (
                    <Badge variant="outline">{item.score}</Badge>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  {item.grade ? (
                    <Badge className="font-semibold">{item.grade}</Badge>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}