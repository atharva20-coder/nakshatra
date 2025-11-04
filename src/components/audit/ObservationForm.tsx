// src/components/audit/ObservationForm.tsx
"use client";

import React, { useState } from "react";
import { Audit, Observation, ObservationSeverity, User } from "@/generated/prisma";
import { useTableRows } from "@/hooks/use-table-rows";
import { Button } from "../ui/button";
import { Loader2, Plus, Save, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useDebounce } from "@/hooks/use-debounce"; // We'll create this next
import { getObservationHistoryAction, saveAuditObservationsAction } from "@/actions/auditor.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/utils";

type ObservationRow = Partial<Observation> & { 
    id: string; // Ensure id is always a string
    repeatCount?: number;
    isLoadingCount?: boolean;
};

const createNewObservation = (): ObservationRow => ({
  id: `new-${Date.now()}`,
  observationNumber: "",
  category: "General",
  severity: "MEDIUM",
  description: "",
  repeatCount: 0,
  isLoadingCount: false,
});

interface ObservationFormProps {
  audit: Audit & { agency: Pick<User, "id" | "name"> };
  initialObservations: Observation[];
}

export const ObservationForm = ({ audit, initialObservations }: ObservationFormProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const {
    rows,
    setRows,
    addRow,
    removeRow,
    handleInputChange,
  } = useTableRows<ObservationRow>(initialObservations.length > 0 ? initialObservations : [createNewObservation()], createNewObservation);

  // --- Debounce logic for repeat count ---
  const checkObservationHistory = async (rowIndex: number, obsNumber: string) => {
    if (!obsNumber) {
        setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, repeatCount: 0, isLoadingCount: false } : row));
        return;
    }

    setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, isLoadingCount: true } : row));

    const result = await getObservationHistoryAction(audit.agencyId, obsNumber);
    
    if (result.error) {
        toast.error(result.error);
    } else {
        setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, repeatCount: result.count, isLoadingCount: false } : row));
    }
  };

  // Debounce the function call
  const debouncedCheck = useDebounce(checkObservationHistory, 500);

  const handleObsNumberChange = (rowId: string, value: string) => {
    handleInputChange(rowId, "observationNumber", value);
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex !== -1) {
        debouncedCheck(rowIndex, value);
    }
  };
  
  // --- Save Handler ---
  const handleSave = async () => {
    if (rows.some(row => !row.observationNumber || !row.description)) {
        toast.error("Please fill in at least an Observation Number and Description for all rows.");
        return;
    }
    
    setIsPending(true);
    try {
        const result = await saveAuditObservationsAction(audit.id, rows);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.message);
            router.refresh();
        }
    } catch (error) {
        toast.error(getErrorMessage(error));
    } finally {
        setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Audit Observations</CardTitle>
          <CardDescription>
            Add or edit observations for this audit of <strong>{audit.agency.name}</strong>. 
            The final scorecard will be filled by an Admin based on these findings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obs. Number</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="w-[180px] align-top">
                      <Input
                        value={row.observationNumber}
                        onChange={(e) => handleObsNumberChange(row.id, e.target.value)}
                        placeholder="e.g., F-01"
                        disabled={isPending}
                      />
                      {row.isLoadingCount ? (
                        <span className="text-xs text-muted-foreground flex items-center mt-1">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Checking...
                        </span>
                      ) : row.repeatCount && row.repeatCount > 0 ? (
                        <span className="text-xs text-destructive font-medium mt-1">
                            Repeated {row.repeatCount} time(s)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="w-[180px] align-top">
                      <Input
                        value={row.category}
                        onChange={(e) => handleInputChange(row.id, "category", e.target.value)}
                        placeholder="e.g., General"
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell className="w-[180px] align-top">
                        <Select
                            value={row.severity}
                            onValueChange={(value) => handleInputChange(row.id, "severity", value)}
                            disabled={isPending}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(ObservationSeverity).map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell className="min-w-[300px] align-top">
                      <Textarea
                        value={row.description}
                        onChange={(e) => handleInputChange(row.id, "description", e.target.value)}
                        placeholder="Enter observation details..."
                        disabled={isPending}
                        rows={3}
                      />
                    </TableCell>
                    <TableCell className="w-[60px] align-top text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={isPending || rows.length <= 1}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={isPending}
            >
                <Plus className="h-4 w-4 mr-2" /> Add Observation
            </Button>
            
            <Button
                onClick={handleSave}
                disabled={isPending}
                className="bg-rose-800 hover:bg-rose-900 text-white"
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Save className="h-4 w-4 mr-2" />
                )}
                Save Observations
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};