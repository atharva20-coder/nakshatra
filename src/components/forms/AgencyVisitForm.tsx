// src/components/forms/AgencyVisitForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTableRows } from "@/hooks/use-table-rows";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Save,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  saveAgencyVisitAction,
  deleteAgencyVisitAction,
  getAgencyVisitByMonthYear,
} from "@/actions/agency-visit.action";
import { cn } from "@/lib/utils";
import { AgencyTableRow, FORM_CONFIGS } from "@/types/forms";
import { ApprovalButton } from "@/components/approval-button-with-session";
import { CMSessionIndicator } from "@/components/cm-session-indicator";
import { Badge } from "@/components/ui/badge";
import { ApprovalDetailsModal } from "@/components/approval-details-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ApprovalRequestDialog,
} from "@/components/approval-request-dialog";
import {
  ApprovalHistoryDialog,
} from "@/components/approval-history-dialog";
import { useSession } from "@/lib/auth-client";
import { useFormApproval } from "@/hooks/use-form-approval";
import {
  ApprovalStatusAlerts,
} from "@/components/forms/ApprovalStatusAlerts";
import { getMonthName } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface AgencyVisitFormProps {
  initialData?: {
    id: string;
    status: string;
    createdAt: Date;
    details: AgencyTableRow[];
    agencyInfo?: { userId: string; name: string; email: string };
  } | null;
  isAdminView?: boolean;
}

// Factory for new rows
const createNewRow = (id: number): AgencyTableRow => {
  const now = new Date();
  return {
    id,
    srNo: String(id),
    dateOfVisit: now.toISOString().split("T")[0],
    employeeId: "",
    employeeName: "",
    mobileNo: "",
    branchLocation: "",
    product: "",
    bucketDpd: "",
    timeIn: now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }),
    timeOut: "",
    signature: "",
    purposeOfVisit: "",
  };
};

const MONTHS = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// More specific type to handle server response
type ServerResponse = {
  error?: "OVERDUE";
  id?: string;
  message?: string;
  details?: string;
} | null;

export const AgencyVisitForm = ({
  initialData,
  isAdminView = false,
}: AgencyVisitFormProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const metadata = FORM_CONFIGS.agencyVisits;

  // --- STATE LOGIC ---
  const [now] = useState(new Date()); // Store the date on load
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const getInitialDate = () => {
    const dateToUse = initialData?.createdAt
      ? new Date(initialData.createdAt)
      : new Date();
    return {
      month: dateToUse.getMonth() + 1,
      year: dateToUse.getFullYear(),
    };
  };

  const [formData, setFormData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState(getInitialDate());

  // NEW: State to track if we are viewing a back-dated (read-only) form
  const [isBackDated, setIsBackDated] = useState(
    selectedDate.month !== currentMonth || selectedDate.year !== currentYear
  );
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [showNoDataMessage, setShowNoDataMessage] = useState(!initialData);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(
    formData?.status === "SUBMITTED"
  );
  const [cmSessionId, setCmSessionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const dataToUse = formData;

  const {
    approvalStatus,
    canEdit: canUserRequestEdit,
    refreshApprovalStatus,
  } = useFormApproval({
    formId: dataToUse?.id,
    formType: "agencyVisits",
    formStatus: dataToUse?.status,
  });

  // CRITICAL: Form is only editable if it's not admin, user has permission, AND it's not back-dated
  const isFormEditable = !isAdminView && canUserRequestEdit() && !isBackDated;

  const { rows, addRow, removeRow, handleInputChange, updateRowValue, setRows } =
    useTableRows<AgencyTableRow>(
      dataToUse?.details ?? [createNewRow(1)],
      createNewRow
    );

  // Sync component state when data changes (on load)
  useEffect(() => {
    const newDate = getInitialDate();
    setRows(dataToUse?.details ?? [createNewRow(1)]);
    setIsSubmitted(dataToUse?.status === "SUBMITTED");
    setShowNoDataMessage(!dataToUse);
    setIsBackDated(newDate.month !== currentMonth || newDate.year !== currentYear);

    if (newDate.month !== selectedDate.month || newDate.year !== selectedDate.year) {
      setSelectedDate(newDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataToUse, setRows]);

  // --- DATA FETCHING EFFECT (Manual Debounce) ---
  useEffect(() => {
    const initialDate = getInitialDate();

    // Check if the selected date is different from the form's loaded date
    const dateHasChanged =
      selectedDate.month !== initialDate.month ||
      selectedDate.year !== initialDate.year;

    if (!dateHasChanged) {
      return; // Do nothing if the date is still the one from initialData
    }

    // Set up the timer
    const timer = setTimeout(async () => {
      setIsNavigating(true);
      setShowNoDataMessage(false);
      
      // NEW: Set back-dated status immediately
      const isNavigatingToBackDate =
        selectedDate.month !== currentMonth || selectedDate.year !== currentYear;
      setIsBackDated(isNavigatingToBackDate);

      try {
        const data = (await getAgencyVisitByMonthYear(
          selectedDate.month,
          selectedDate.year
        )) as ServerResponse;

        if (data && data.error === "OVERDUE") {
          toast.error(data.message, {
            description: data.details,
          });
          setSelectedDate(getInitialDate()); // Reset dropdowns
          setIsBackDated(getInitialDate().month !== currentMonth || getInitialDate().year !== currentYear);
          setIsNavigating(false);
        } else if (data && data.id) {
          router.push(`/user/forms/agencyVisits/${data.id}`);
          // Page will reload and end navigation
        } else {
          setFormData(null);
          setRows([]); // Use empty array for "No Data" row
          setIsSubmitted(false);
          setShowNoDataMessage(true);
          setIsNavigating(false);
        }
      } catch {
        toast.error("Failed to fetch form data.");
        setIsNavigating(false);
      }
    }, 500); // 500ms debounce

    // Cleanup function
    return () => clearTimeout(timer);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, router]);
  // ---

  // Helper function
  const isValidApproval = (approvalData: string | null): boolean => {
    if (!approvalData) return false;
    try {
      const parsed = JSON.parse(approvalData);
      return !!(parsed && parsed.signature && parsed.collectionManager);
    } catch {
      return false;
    }
  };

  const handleApprove = (
    rowId: number | string,
    approvalData: {
      signature: string;
      timestamp: string;
      collectionManager: {
        name: string;
        email: string;
        designation: string;
        productTag: string;
      };
      remarks?: string;
    }
  ) => {
    if (isAdminView || isBackDated) return; // Extra safeguard
    const approvalJsonString = JSON.stringify(approvalData);
    updateRowValue(rowId, "signature", approvalJsonString);
    const currentRow = rows.find((r) => r.id === rowId);
    if (currentRow && !currentRow.timeOut) {
      const now = new Date();
      updateRowValue(
        rowId,
        "timeOut",
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    toast.success(
      `Visit record approved by ${approvalData.collectionManager.name}.`
    );
  };

  const handleViewApproval = (approvalData: string) => {
    setSelectedApproval(approvalData);
    setIsModalOpen(true);
  };

  const handleSaveOrSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!isFormEditable) return; // Guard against back-dated saves

    if (rows.length === 0) {
      toast.error("Please add at least one visit record."); return;
    }
    const hasEmptyFields = rows.some(
      (row) =>
        !row.employeeId ||
        !row.employeeName ||
        !row.dateOfVisit ||
        !row.branchLocation
    );
    if (hasEmptyFields) {
      toast.error(
        "Please fill in all required fields (Employee ID, Name, Date, Location)."
      );
      return;
    }
    if (status === "SUBMITTED") {
      const unapprovedRows = rows.filter(
        (row) => !isValidApproval(row.signature)
      );
      if (unapprovedRows.length > 0) {
        toast.error(
          `${unapprovedRows.length} visit(s) still need Collection Manager approval before submission.`
        );
        return;
      }
    }
    setIsPending(true);
    const rowsToSubmit = rows.map((row) => {
      const { ...rowWithoutId } = row;
      return rowWithoutId;
    });

    const isNewForm = !dataToUse?.id;

    // Call simplified action (no targetMonth/Year)
    const result = await saveAgencyVisitAction(
      rowsToSubmit,
      status,
      dataToUse?.id
    );
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Form saved!");
      if (result.formId && isNewForm) {
        router.push(`/user/forms/agencyVisits/${result.formId}`);
      } else {
        router.refresh();
        if (status === "SUBMITTED") {
          setIsSubmitted(true);
          refreshApprovalStatus();
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!isFormEditable || !dataToUse?.id) return; // Guard against back-dated deletes

    if (
      !confirm(
        "Are you sure you want to delete this draft? This action cannot be undone."
      )
    ) {
      return;
    }
    setIsPending(true);
    const result = await deleteAgencyVisitAction(dataToUse.id);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Draft deleted successfully");
      setFormData(null); // Clear form
      setRows([]); // Set empty rows for "No Data" message
      setShowNoDataMessage(true); // Show no data message
      router.refresh();
    }
  };

  const getVisitStats = () => {
    const total = rows.length;
    const approved = rows.filter((r) => isValidApproval(r.signature)).length;
    const pending = rows.filter((r) => !isValidApproval(r.signature)).length;
    const completed = rows.filter((r) => r.timeOut && r.timeOut !== "").length;
    return { total, approved, pending, completed };
  };
  const stats = getVisitStats();

  const getValidityPeriod = () => {
    if (isAdminView) return "Viewing as Admin";
    const { month, year } = selectedDate;
    const monthName = getMonthName(month) || "N/A";
    const startDate = `01-${monthName}-${year}`;
    const endDate = `05-${getMonthName(month === 12 ? 1 : month + 1)}-${
      month === 12 ? year + 1 : year
    }`;
    return `Validity Period: ${startDate} - ${endDate}`;
  };

  // --- START OF REDESIGNED LAYOUT ---
  return (
    <div className="space-y-6">
      {/* CM Session Indicator: ONLY show if form is editable AND not back-dated */}
      {!isAdminView && isFormEditable && !isBackDated && (
        <CMSessionIndicator
          onSessionChange={(sessionId) => setCmSessionId(sessionId)}
        />
      )}

      {/* 1. Header Section (MODIFIED) */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">{metadata.title}</h1>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {getValidityPeriod()}
          </p>
        </div>

        {/* Form ID is now in the header */}
        {dataToUse?.id && !isAdminView && (
          <div className="text-sm text-muted-foreground font-mono bg-gray-100 px-3 py-1.5 rounded-md inline-block flex-shrink-0">
            <span className="font-semibold">Form ID:</span>{" "}
            {dataToUse.id.split("-")[0]}...
          </div>
        )}
      </div>

      {/* 2. Controls Section (MODIFIED) */}
      {!isAdminView && (
        <div className="flex justify-between items-end gap-4">
          {/* Month/Year Dropdowns */}
          <div className="flex items-end gap-4">
            <div>
              <Label className="text-sm font-medium">
                Select Month/Year to view back dated form
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Select
                  value={String(selectedDate.month)}
                  onValueChange={(value) =>
                    setSelectedDate((prev) => ({
                      ...prev,
                      month: parseInt(value),
                    }))
                  }
                  disabled={isNavigating || isPending}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(selectedDate.year)}
                  onValueChange={(value) =>
                    setSelectedDate((prev) => ({
                      ...prev,
                      year: parseInt(value),
                    }))
                  }
                  disabled={isNavigating || isPending}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons are now below the header */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {dataToUse?.id && (
              <Button
                variant="outline"
                onClick={() => setShowHistoryDialog(true)}
                disabled={isPending}
              >
                Request/Approval History
              </Button>
            )}
            {/* Show Request button only if submitted AND it's NOT a back-dated form */}
            {!isFormEditable && isSubmitted && !isBackDated && (
              <Button
                className="bg-rose-800 hover:bg-rose-900"
                onClick={() => setShowApprovalDialog(true)}
                disabled={isPending || approvalStatus.hasRequest}
              >
                Request/Approval
              </Button>
            )}
            {/* Show Delete button only if form is editable */}
            {isFormEditable && dataToUse?.id && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. Banners Section */}
      <div className="space-y-3">
        {isAdminView && initialData?.agencyInfo && (
          <Alert
            variant="default"
            className="bg-blue-50 border-blue-200 text-blue-800"
          >
            <AlertCircle className="h-4 w-4 !text-blue-800" />
            <AlertTitle>Viewing as Admin</AlertTitle>
            <AlertDescription>
              Viewing submission for{" "}
              <strong>{initialData.agencyInfo.name}</strong>. Status:{" "}
              <Badge
                variant={
                  initialData.status === "SUBMITTED" ? "default" : "secondary"
                }
                className={
                  initialData.status === "SUBMITTED"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {initialData.status}
              </Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Show approval alerts only if NOT back-dated */}
        {!isAdminView && !isBackDated && (
          <ApprovalStatusAlerts
            approvalStatus={approvalStatus}
            isSubmitted={isSubmitted}
            canEdit={isFormEditable}
          />
        )}
        
        {/* NEW: Show read-only alert if back-dated */}
        {!isAdminView && isBackDated && (
           <Alert variant="default" className="bg-gray-50 border-gray-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Read-Only Mode</AlertTitle>
            <AlertDescription>
              You are viewing a back-dated form. All fields are read-only.
            </AlertDescription>
          </Alert>
        )}

        {/* "No Data" message is now handled in the table body */}

        {/* CM Banners: Only show if form is editable (i.e., not back-dated) */}
        {isFormEditable && !cmSessionId && stats.pending > 0 && (
          <Alert
            variant="default"
            className="bg-amber-50 border-amber-200 text-amber-800"
          >
            <AlertCircle className="h-4 w-4 !text-amber-800" />
            <AlertTitle>Collection Manager Login Required</AlertTitle>
            <AlertDescription>
              A Collection Manager must login using the &ldquo;CM Login&rdquo;
              button (top right) to approve visit records.
            </AlertDescription>
          </Alert>
        )}
        {isFormEditable && cmSessionId && (
          <Alert
            variant="default"
            className="bg-green-50 border-green-200 text-green-800"
          >
            <CheckCircle className="h-4 w-4 !text-green-800" />
            <AlertTitle>Collection Manager Active</AlertTitle>
            <AlertDescription>
              A Collection Manager is logged in and can now approve records.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* --- Loading Spinner --- */}
      {isNavigating && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="ml-3 text-muted-foreground">
            Loading data for{" "}
            {MONTHS.find((m) => m.value === selectedDate.month)?.name}{" "}
            {selectedDate.year}...
          </p>
        </div>
      )}

      {/* --- HIDE FORM WHILE NAVIGATING --- */}
      {!isNavigating && (
        <>
          {/* Stats Section */}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Visits
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.approved}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">
                  Approved
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                  Pending Approval
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.completed}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  Completed
                </div>
              </div>
            </div>
          )}

          {/* 4. Table Section (from Figma) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Visit Records
              </h3>
              {/* Add Visit button is now conditional on isFormEditable */}
              {isFormEditable && (
                <Button
                  onClick={addRow}
                  disabled={isPending || isNavigating}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Visit
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden dark:border-gray-700">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableHead>Sr. No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Bucket/DPD</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>CM Approval*</TableHead>
                      <TableHead>Purpose</TableHead>
                      {isFormEditable && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                    {/* NEW: Handle "No Data" message inside table */}
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isFormEditable ? 13 : 12}
                          className="h-48 text-center text-muted-foreground"
                        >
                          No data exist for{" "}
                          {getMonthName(selectedDate.month)}{" "}
                          {selectedDate.year}.
                          {/* Show create message only if it's the current month */}
                          {!isBackDated &&
                            " You can add a new visit to create a form for this period."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const hasValidApproval = isValidApproval(row.signature);

                        return (
                          <TableRow
                            key={row.id}
                            className={cn(
                              "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            )}
                          >
                            <TableCell className="font-medium">{row.srNo}</TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={row.dateOfVisit}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "dateOfVisit",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[140px] h-9"
                                disabled={!isFormEditable || isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.employeeId}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "employeeId",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Employee ID"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.employeeName}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "employeeName",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[150px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Name"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.mobileNo}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "mobileNo",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Mobile"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.branchLocation}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "branchLocation",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[150px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Branch"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.product}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "product",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Product"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.bucketDpd}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "bucketDpd",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Bucket"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={row.timeIn}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "timeIn",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] h-9"
                                disabled={!isFormEditable || isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={row.timeOut}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "timeOut",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] h-9"
                                disabled={!isFormEditable || isPending}
                              />
                            </TableCell>
                            <TableCell>
                              {hasValidApproval ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full h-8 text-xs font-medium text-green-700 border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800/30"
                                  onClick={() =>
                                    handleViewApproval(row.signature!)
                                  }
                                >
                                  <CheckCircle className="h-3 w-3 mr-1.5" />
                                  View Approval
                                </Button>
                              ) : !isAdminView && isFormEditable ? (
                                // This button is only rendered if isFormEditable is true
                                <ApprovalButton
                                  rowId={row.id}
                                  formType="agencyVisits"
                                  formId={dataToUse?.id || "draft"}
                                  fieldToUpdate="signature"
                                  cmSessionId={cmSessionId}
                                  onApprovalSuccess={handleApprove}
                                  disabled={isPending}
                                  isApproved={false}
                                  approvalSignature={undefined}
                                />
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  Not Approved
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.purposeOfVisit}
                                onChange={(e) =>
                                  handleInputChange(
                                    row.id,
                                    "purposeOfVisit",
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[150px] h-9"
                                disabled={!isFormEditable || isPending}
                                placeholder="Purpose"
                              />
                            </TableCell>
                            {isFormEditable && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRow(row.id)}
                                  disabled={
                                    !isFormEditable ||
                                    isPending ||
                                    rows.length <= 1
                                  }
                                  className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                  title={
                                    rows.length <= 1
                                      ? "At least one visit is required"
                                      : "Remove visit"
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* 5. Bottom Action Bar (from Figma) */}
          {/* This bar is now conditional on isFormEditable */}
          {isFormEditable && (
            <div className="flex gap-4 justify-end mt-6 pt-6 border-t dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => handleSaveOrSubmit("DRAFT")}
                disabled={isPending || isNavigating}
                className="w-36"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={() => handleSaveOrSubmit("SUBMITTED")}
                disabled={isPending || stats.pending > 0 || isNavigating}
                className="bg-rose-800 hover:bg-rose-900 text-white w-36"
                title={
                  stats.pending > 0
                    ? "All visits must be approved before submission"
                    : "Submit form"
                }
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit
              </Button>
            </div>
          )}
        </>
      )}
      {/* --- END HIDE FORM WHILE NAVIGATING --- */}

      {(isAdminView || (isSubmitted && !isFormEditable)) && !isNavigating && (
        <div className="text-center py-4 text-muted-foreground mt-6 border-t dark:border-gray-700">
          <p className="text-sm">
            {isAdminView
              ? "Viewing submitted form (read-only)."
              : "This form is submitted and locked."}
          </p>
        </div>
      )}

      {/* 6. Modals */}
      <ApprovalDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        approvalData={selectedApproval}
      />

      {!isAdminView && dataToUse?.id && (
        <>
          <ApprovalRequestDialog
            isOpen={showApprovalDialog}
            onClose={() => setShowApprovalDialog(false)}
            formType="agencyVisits"
            formId={dataToUse.id}
            onSuccess={() => {
              refreshApprovalStatus();
              router.refresh();
            }}
          />
          {session?.user && (
            <ApprovalHistoryDialog
              isOpen={showHistoryDialog}
              onClose={() => setShowHistoryDialog(false)}
              formId={dataToUse.id}
              formType="agencyVisits"
              formTitle={metadata.title}
            />
          )}
        </>
      )}
    </div>
  );
};