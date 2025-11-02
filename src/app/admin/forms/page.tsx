"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getUsersWithSubmissionStats, getUserFormStatus } from "@/actions/form-management.action";
import { getAgencyExportDataAction } from "@/actions/excel-export.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { UserRole } from "@/generated/prisma";
import {
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserFormStatus {
  userId: string;
  userName: string;
  forms: Record<
    string,
    {
      status: "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "OVERDUE";
      formId?: string;
      lastUpdated?: Date;
    }
  >;
}

export default function AdminFormsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);

  // 🔹 Added refresh states
  const [refreshingUserId, setRefreshingUserId] = useState<string | null>(null);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [selectedUserForRefresh, setSelectedUserForRefresh] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [userFormStatuses, setUserFormStatuses] = useState<Record<string, UserFormStatus>>({});
  const loadingStatusesRef = useRef<Set<string>>(new Set());
  const [, setLoadingTick] = useState(0);
  const forceLoadingUpdate = () => setLoadingTick((t) => t + 1);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const searchDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 350);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
    }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  useEffect(() => {
    if (isSessionPending) return;
    if (!session || session.user.role !== UserRole.ADMIN) {
      router.push("/profile");
      return;
    }

    setUsers([]);
    setCurrentPage(1);
    setHasMore(true);
    setUserFormStatuses({});
    fetchUsers(1, true);
  }, [session, isSessionPending, router, searchQuery, selectedMonth, selectedYear]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMoreUsers();
        }
      },
      { threshold: 0.15, rootMargin: "150px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

  const fetchUsers = async (page: number, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const res = await getUsersWithSubmissionStats(
        page,
        pageSize,
        searchQuery,
        selectedMonth,
        selectedYear,
        UserRole.USER
      );

      if (res.error) {
        if (!mountedRef.current) return;
        setError(res.error);
      } else {
        const newUsers: User[] = res.users || [];
        if (!mountedRef.current) return;

        setUsers((prev) => (isInitial ? newUsers : [...prev, ...newUsers]));
        setTotalCount(res.totalCount || 0);
        setHasMore(newUsers.length === pageSize && page * pageSize < (res.totalCount || 0));
        newUsers.forEach((u) => loadUserFormStatus(u.id, u.name));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError("Failed to fetch users");
      console.error("fetchUsers error", err);
    } finally {
      if (!mountedRef.current) return;
      if (isInitial) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  };

  const loadMoreUsers = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchUsers(next, false);
  }, [currentPage, hasMore, isLoadingMore]);

  const loadUserFormStatus = useCallback(
    async (userId: string, userNameFallback?: string) => {
      const isLoadingAlready = loadingStatusesRef.current.has(userId);
      if (isLoadingAlready || userFormStatuses[userId]) return;

      loadingStatusesRef.current.add(userId);
      forceLoadingUpdate();

      try {
        const res = await getUserFormStatus(userId, selectedMonth, selectedYear);
        if (!mountedRef.current) return;
        if (!res.error && res.formStatuses) {
          setUserFormStatuses((prev) => ({
            ...prev,
            [userId]: {
              userId,
              userName: userNameFallback || prev[userId]?.userName || "Unknown",
              forms: res.formStatuses,
            },
          }));
        }
      } catch (err) {
        console.error(`Failed to load status for ${userId}`, err);
      } finally {
        loadingStatusesRef.current.delete(userId);
        forceLoadingUpdate();
      }
    },
    [selectedMonth, selectedYear]
  );

  const handleExportToExcel = async (userId: string, userName: string) => {
    setExportingUserId(userId);
    try {
      const result = await getAgencyExportDataAction(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const wb = XLSX.utils.book_new();
      const summaryData = [
        ["Agency Export Report"],
        ["Agency Name:", result.userData?.name || "Unknown"],
        ["Email:", result.userData?.email || "Unknown"],
        ["Registration Date:", result.userData?.registrationDate ? new Date(result.userData.registrationDate).toLocaleDateString() : "N/A"],
        ["Export Date:", new Date().toLocaleDateString()],
        [],
        ["Form Type", "Total Submissions"],
      ];
      Object.entries(result.forms ?? {}).forEach(([formType, data]) => {
        summaryData.push([
          FORM_CONFIGS[formType as FormType]?.title || formType,
          (data || []).length.toString(),
        ]);
      });
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
      XLSX.writeFile(
        wb,
        `${userName.replace(/[^a-z0-9]/gi, "_")}_Forms_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast.success("Excel file exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export data to Excel");
    } finally {
      if (mountedRef.current) setExportingUserId(null);
    }
  };

  // 🔹 Refresh Handlers
  const initiateRefresh = (user: User) => {
    setSelectedUserForRefresh(user);
    setShowRefreshDialog(true);
  };

  const confirmRefresh = async () => {
    if (!selectedUserForRefresh) return;
    setRefreshingUserId(selectedUserForRefresh.id);
    setShowRefreshDialog(false);

    try {
      const response = await fetch("/api/admin/refresh-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserForRefresh.id }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "Failed to refresh forms");
        return;
      }

      toast.success(result.message || "Forms refreshed successfully");
      fetchUsers(1, true);
    } catch (error) {
      console.error("Error refreshing forms:", error);
      toast.error("Failed to refresh forms");
    } finally {
      setRefreshingUserId(null);
      setSelectedUserForRefresh(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <Badge className="bg-green-100 text-green-800 inline-flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Submitted
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Draft
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  // ⬇️ The “Refresh Forms” button integrated beside “Export”
  return (
    <div className="container mx-auto p-6">
      {/* ...header, filters, etc stay unchanged... */}

      <section className="space-y-6">
        {/* TABLE START */}
        {!isLoading && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      {/* ...status cells unchanged... */}
                      <td className="px-6 py-4 text-center sticky right-0 bg-inherit z-10">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => initiateRefresh(user)}
                            disabled={refreshingUserId === user.id}
                          >
                            {refreshingUserId === user.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin text-rose-900" />
                                Refreshing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 text-rose-900" />
                                Refresh
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportToExcel(user.id, user.name)}
                            disabled={exportingUserId === user.id}
                          >
                            {exportingUserId === user.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin text-rose-900" />
                                Exporting...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2 text-rose-900" />
                                Export
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 🔹 Refresh Confirmation Dialog */}
      <AlertDialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              Refresh Forms for {selectedUserForRefresh?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will refresh form cycles for <strong>{selectedUserForRefresh?.name}</strong>.
              Overdue forms will remain pending until completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRefresh} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Confirm Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
