/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getUsersWithSubmissionStats, getUserFormStatus } from "@/actions/form-management.action";
import { getAgencyExportDataAction } from "@/actions/excel-export.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { UserRole } from "@/generated/prisma";
import { Download, AlertTriangle, CheckCircle, Clock, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserFormStatus {
  userId: string;
  userName: string;
  forms: Record<string, {
    status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'OVERDUE';
    formId?: string;
    lastUpdated?: Date;
  }>;
}

export default function AdminFormsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Form status cache
  const [userFormStatuses, setUserFormStatuses] = useState<Record<string, UserFormStatus>>({});

  // loadingStatuses kept in a ref to avoid re-creating callbacks when mutated
  const loadingStatusesRef = useRef<Set<string>>(new Set());
  const [, setLoadingTick] = useState(0); // used only to force re-render when loadingStatuses changes
  const forceLoadingUpdate = () => setLoadingTick(t => t + 1);

  // mounted ref to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Debounce for search input (simple)
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

  // Memoized options
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }) }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  // Ensure only admin can access
  useEffect(() => {
    if (isSessionPending) return;
    if (!session || session.user.role !== UserRole.ADMIN) {
      router.push('/profile');
      return;
    }

    // Reset and fetch
    setUsers([]);
    setCurrentPage(1);
    setHasMore(true);
    setUserFormStatuses({});
    fetchUsers(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isSessionPending, router, searchQuery, selectedMonth, selectedYear]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
        loadMoreUsers();
      }
    }, { threshold: 0.15, rootMargin: '150px' });

    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoading, isLoadingMore]);

  // Fetch users
  const fetchUsers = async (page: number, isInitial = false) => {
    if (isInitial) setIsLoading(true); else setIsLoadingMore(true);

    try {
      const res = await getUsersWithSubmissionStats(page, pageSize, searchQuery, selectedMonth, selectedYear);
      if (res.error) {
        if (!mountedRef.current) return;
        setError(res.error);
      } else {
        const newUsers: User[] = res.users || [];
        if (!mountedRef.current) return;

        setUsers(prev => isInitial ? newUsers : [...prev, ...newUsers]);
        setTotalCount(res.totalCount || 0);
        setHasMore((newUsers.length === pageSize) && ((page * pageSize) < (res.totalCount || 0)));

        // Load statuses (pass userName to avoid race conditions)
        newUsers.forEach(u => loadUserFormStatus(u.id, u.name));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError('Failed to fetch users');
      console.error('fetchUsers error', err);
    } finally {
      if (!mountedRef.current) return;
      if (isInitial) setIsLoading(false); else setIsLoadingMore(false);
    }
  };

  const loadMoreUsers = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchUsers(next, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, hasMore, isLoadingMore]);

  // Improved loadUserFormStatus: uses refs to check loading and avoids stale user name
  const loadUserFormStatus = useCallback(async (userId: string, userNameFallback?: string) => {
    const isLoadingAlready = loadingStatusesRef.current.has(userId);
    if (isLoadingAlready || userFormStatuses[userId]) return;

    loadingStatusesRef.current.add(userId);
    forceLoadingUpdate();

    try {
      const res = await getUserFormStatus(userId, selectedMonth, selectedYear);
      if (!mountedRef.current) return;
      if (!res.error && res.formStatuses) {
        setUserFormStatuses(prev => ({
          ...prev,
          [userId]: {
            userId,
            userName: userNameFallback || prev[userId]?.userName || 'Unknown',
            forms: res.formStatuses
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to load status for ${userId}`, err);
    } finally {
      loadingStatusesRef.current.delete(userId);
      forceLoadingUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const handleSearchClick = () => {
    // immediate apply (debounce also updates searchQuery)
    setSearchQuery(searchInput.trim());
  };

  const handleMonthChange = (month: number) => { setSelectedMonth(month); };
  const handleYearChange = (year: number) => { setSelectedYear(year); };

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
        ['Agency Export Report'],
        ['Agency Name:', result.userData?.name || 'Unknown'],
        ['Email:', result.userData?.email || 'Unknown'],
        ['Registration Date:', result.userData?.registrationDate ? new Date(result.userData.registrationDate).toLocaleDateString() : 'N/A'],
        ['Export Date:', new Date().toLocaleDateString()],
        [],
        ['Form Type', 'Total Submissions']
      ];

      Object.entries(result.forms ?? {}).forEach(([formType, data]) => {
        summaryData.push([FORM_CONFIGS[formType as FormType]?.title || formType, (data || []).length.toString()]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      Object.entries(result.forms ?? {}).forEach(([formType, submissions]: [string, any]) => {
        if (!submissions || submissions.length === 0) return;
        const formConfig = FORM_CONFIGS[formType as FormType];
        const sheetData: any[] = [];

        sheetData.push([formConfig?.title || formType]);
        sheetData.push([]);

        submissions.forEach((sub: any, index: number) => {
          sheetData.push([`Submission ${index + 1}`]);
          sheetData.push(['Submitted On:', new Date(sub.submissionDate).toLocaleString()]);
          sheetData.push(['Status:', sub.status]);
          sheetData.push([]);

          if (sub.data?.details && sub.data.details.length > 0) {
            const headers = Object.keys(sub.data.details[0]).filter((k: string) => k !== 'id');
            sheetData.push(headers);
            sub.data.details.forEach((detail: any) => {
              const row = headers.map((h: string) => {
                const value = detail[h];
                if (value instanceof Date) return value.toLocaleDateString();
                return (value ?? '').toString();
              });
              sheetData.push(row);
            });
          }

          sheetData.push([]);
        });

        const sheet = XLSX.utils.aoa_to_sheet(sheetData);
        const sheetName = (formConfig?.title || formType).substring(0, 31);
        XLSX.utils.book_append_sheet(wb, sheet, sheetName);
      });

      const fileName = `${userName.replace(/[^a-z0-9]/gi, '_')}_Forms_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Excel file exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export data to Excel');
    } finally {
      if (mountedRef.current) setExportingUserId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge className="bg-green-100 text-green-800 inline-flex items-center gap-1"><CheckCircle className="h-3 w-3" />Submitted</Badge>;
      case 'DRAFT':
        return <Badge className="bg-yellow-100 text-yellow-800 inline-flex items-center gap-1"><Clock className="h-3 w-3" />Draft</Badge>;
      case 'OVERDUE':
        return <Badge variant="destructive" className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>;
      default:
        return <Badge variant="outline" className="border-rose-900 text-rose-900">Not Started</Badge>;
    }
  };

  // Small helper to render table header titles (respects length)
  const renderTitle = (t?: string) => (t && t.length > 18 ? t.substring(0, 18) + '...' : (t || ''));

  if (isSessionPending) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-rose-900 mx-auto mb-3" />
          <div className="text-gray-600">Checking session...</div>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return <div className="container mx-auto p-8">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-rose-900">Admin • Form Management</h1>
        <p className="text-sm text-gray-600">Track agency submissions and compliance — month & year filters are applied.</p>
      </header>

      <section className="space-y-6">
        {/* Filters card */}
        <div className="bg-white rounded-2xl shadow p-4 border-t-4 border-rose-900 sticky top-4 z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Agencies</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by agency name or email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                />
                <Button onClick={handleSearchClick} className="bg-rose-900 hover:bg-rose-800 text-white">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(val) => handleMonthChange(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(val) => handleYearChange(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-sm text-gray-600">
          <div>Showing <strong className="text-gray-900">{users.length}</strong> of <strong className="text-gray-900">{totalCount}</strong> agencies</div>
          <div>Viewing: <strong className="text-gray-900">{monthOptions.find(m=>m.value===selectedMonth)?.label} {selectedYear}</strong></div>
        </div>

        {/* Main table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-rose-900" />
            <div className="text-gray-600">Loading agencies…</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Agency</th>
                    {Object.entries(FORM_CONFIGS).filter(([,cfg]) => cfg.isRequired).map(([formType, cfg]) => (
                      <th key={formType} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[120px]">{renderTitle(cfg.title)}</th>
                    ))}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => {
                    const userStatus = userFormStatuses[user.id];
                    const isLoadingStatus = loadingStatusesRef.current.has(user.id);
                    const hasOverdue = userStatus ? Object.values(userStatus.forms).some(f=>f.status==='OVERDUE') : false;

                    return (
                      <tr key={user.id} className={hasOverdue ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                          <Link href={`/admin/users/${user.id}`} className="text-rose-900 hover:underline">{user.name}</Link>
                          {hasOverdue && <span className="ml-2 text-red-600"><AlertTriangle className="h-4 w-4 inline" /></span>}
                        </td>

                        {Object.entries(FORM_CONFIGS).filter(([,cfg]) => cfg.isRequired).map(([formType]) => {
                          const formStatus = userStatus?.forms[formType];
                          return (
                            <td key={formType} className="px-4 py-4 text-center align-middle">
                              {isLoadingStatus ? (
                                <div className="flex justify-center">
                                  <div className="animate-pulse bg-gray-200 h-6 w-20 rounded" />
                                </div>
                              ) : formStatus ? (
                                <div className="flex flex-col items-center gap-1">
                                  {getStatusBadge(formStatus.status)}
                                  {formStatus.formId && (
                                    <Link href={`/forms/${formType}/${formStatus.formId}`} className="text-xs text-rose-900 hover:underline">View</Link>
                                  )}
                                </div>
                              ) : (
                                getStatusBadge('NOT_STARTED')
                              )}
                            </td>
                          );
                        })}

                        <td className="px-6 py-4 text-center sticky right-0 bg-inherit z-10">
                          <Button size="sm" variant="outline" onClick={() => handleExportToExcel(user.id, user.name)} disabled={exportingUserId===user.id}>
                            {exportingUserId === user.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin text-rose-900" />
                                Exporting...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2 text-rose-900" />
                                <span className="text-rose-900">Export</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No agencies found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No agencies registered yet</p>
                  </>
                )}
              </div>
            )}

            <div ref={observerTarget} className="py-6">
              {isLoadingMore && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-900" />
                  <p className="text-sm text-gray-600">Loading more agencies...</p>
                </div>
              )}

              {!hasMore && users.length > 0 && (
                <div className="text-center text-gray-500 py-4">✓ All agencies loaded ({totalCount} total)</div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}