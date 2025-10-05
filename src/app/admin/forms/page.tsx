/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const observerTarget = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Form status cache
  const [userFormStatuses, setUserFormStatuses] = useState<Record<string, UserFormStatus>>({});
  const [loadingStatuses, setLoadingStatuses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isSessionPending) return;

    if (!session || session.user.role !== UserRole.ADMIN) {
        router.push("/profile");
        return;
    }

    // Reset and load initial data when filters change
    setUsers([]);
    setCurrentPage(1);
    setHasMore(true);
    setUserFormStatuses({});
    fetchUsers(1, true);
  }, [session, isSessionPending, router, searchQuery, selectedMonth, selectedYear]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMoreUsers();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, currentPage]);

  const fetchUsers = async (page: number, isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await getUsersWithSubmissionStats(
        page,
        pageSize,
        searchQuery,
        selectedMonth,
        selectedYear
      );
      
      if (result.error) {
        setError(result.error);
      } else {
        const newUsers = result.users || [];
        
        setUsers(prev => isInitial ? newUsers : [...prev, ...newUsers]);
        setTotalCount(result.totalCount || 0);
        setHasMore(newUsers.length === pageSize && (page * pageSize) < (result.totalCount || 0));
        
        // Load form statuses for new users
        newUsers.forEach(user => {
          loadUserFormStatus(user.id);
        });
      }
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      if (isInitial) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const loadMoreUsers = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchUsers(nextPage, false);
  }, [currentPage, hasMore, isLoadingMore]);

  const loadUserFormStatus = useCallback(async (userId: string) => {
    if (loadingStatuses.has(userId) || userFormStatuses[userId]) return;

    setLoadingStatuses(prev => new Set(prev).add(userId));

    try {
      const result = await getUserFormStatus(userId, selectedMonth, selectedYear);
      
      if (!result.error && result.formStatuses) {
        setUserFormStatuses(prev => ({
          ...prev,
          [userId]: {
            userId,
            userName: users.find(u => u.id === userId)?.name || 'Unknown',
            forms: result.formStatuses
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to load status for user ${userId}`, err);
    } finally {
      setLoadingStatuses(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [users, selectedMonth, selectedYear, loadingStatuses, userFormStatuses]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

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
        summaryData.push([
          FORM_CONFIGS[formType as FormType]?.title || formType,
          data.length.toString()
        ]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      Object.entries(result.forms ?? {}).forEach(([formType, submissions]: [string, any]) => {
        if (submissions.length === 0) return;

        const formConfig = FORM_CONFIGS[formType as FormType];
        const sheetData: any[] = [];

        sheetData.push([formConfig?.title || formType]);
        sheetData.push([]);

        submissions.forEach((sub: any, index: number) => {
          sheetData.push([`Submission ${index + 1}`]);
          sheetData.push(['Submitted On:', new Date(sub.submissionDate).toLocaleString()]);
          sheetData.push(['Status:', sub.status]);
          sheetData.push([]);

          if (sub.data.details && sub.data.details.length > 0) {
            const headers = Object.keys(sub.data.details[0]).filter(key => key !== 'id');
            sheetData.push(headers);

            sub.data.details.forEach((detail: any) => {
              const row = headers.map(header => {
                const value = detail[header];
                if (value instanceof Date) return value.toLocaleDateString();
                return value?.toString() || '';
              });
              sheetData.push(row);
            });
          }

          sheetData.push([]);
          sheetData.push([]);
        });

        const sheet = XLSX.utils.aoa_to_sheet(sheetData);
        const sheetName = formConfig?.title.substring(0, 31) || formType.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, sheet, sheetName);
      });

      const fileName = `${userName.replace(/[^a-z0-9]/gi, '_')}_Forms_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data to Excel');
    } finally {
      setExportingUserId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'DRAFT':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'OVERDUE':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getMonthOptions = () => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push({ value: i, label: new Date(2000, i - 1, 1).toLocaleString('default', { month: 'long' }) });
    }
    return months;
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  if (isSessionPending) {
      return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (error && users.length === 0) {
      return <div className="container mx-auto p-8">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Admin - Form Management</h1>
        <p className="text-gray-600">Monitor all agency form submissions and compliance status</p>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 sticky top-0 z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Agencies</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} className="bg-rose-800 hover:bg-rose-900">
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
                  {getMonthOptions().map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
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
                  {getYearOptions().map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <span>
            Showing <strong>{users.length}</strong> of <strong>{totalCount}</strong> agencies
          </span>
          <span>
            Viewing: <strong>{getMonthOptions().find(m => m.value === selectedMonth)?.label} {selectedYear}</strong>
          </span>
        </div>

        {/* Status Overview */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-rose-800" />
            <div className="text-gray-600">Loading agencies...</div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-[140px] z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                        Agency
                      </th>
                      {Object.entries(FORM_CONFIGS).filter(([, config]) => config.isRequired).map(([formType, config]) => (
                        <th key={formType} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[120px]">
                          {config.title.length > 20 ? config.title.substring(0, 20) + '...' : config.title}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => {
                      const userStatus = userFormStatuses[user.id];
                      const isLoadingStatus = loadingStatuses.has(user.id);
                      const hasOverdue = userStatus ? Object.values(userStatus.forms).some(f => f.status === 'OVERDUE') : false;
                      
                      return (
                        <tr key={user.id} className={hasOverdue ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                            <Link href={`/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-900 hover:underline">
                              {user.name}
                            </Link>
                            {hasOverdue && (
                              <span className="ml-2 text-red-600">
                                <AlertTriangle className="h-4 w-4 inline" />
                              </span>
                            )}
                          </td>
                          {Object.entries(FORM_CONFIGS).filter(([, config]) => config.isRequired).map(([formType]) => {
                            const formStatus = userStatus?.forms[formType];
                            return (
                              <td key={formType} className="px-4 py-4 text-center">
                                {isLoadingStatus ? (
                                  <div className="flex justify-center">
                                    <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                                  </div>
                                ) : formStatus ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {getStatusBadge(formStatus.status)}
                                    {formStatus.formId && (
                                      <Link
                                        href={`/forms/${formType}/${formStatus.formId}`}
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        View
                                      </Link>
                                    )}
                                  </div>
                                ) : (
                                  getStatusBadge('NOT_STARTED')
                                )}
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 text-center sticky right-0 bg-inherit z-10">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExportToExcel(user.id, user.name)}
                              disabled={exportingUserId === user.id}
                            >
                              {exportingUserId === user.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Exporting...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export
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
              
              {users.length === 0 && !isLoading && (
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
            </div>

            {/* Infinite Scroll Loader */}
            <div ref={observerTarget} className="py-8">
              {isLoadingMore && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-800" />
                  <p className="text-sm text-gray-600">Loading more agencies...</p>
                </div>
              )}
              {!hasMore && users.length > 0 && (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">✓ All agencies loaded ({totalCount} total)</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}