// src/app/collectionManager/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { 
  getAssignedAgenciesForCMAction, 
  markCMAssignmentsAsViewedAction, 
  type AssignedAgencyInfo 
} from "@/actions/collection-manager.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, Calendar, FileText, Clock, Loader2, TrendingUp, AlertCircle, UserCheck } from "lucide-react";
import { UserRole } from "@/generated/prisma";
import { ReturnButton } from "@/components/return-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdvisoryMarquee } from "@/components/AdvisoryMarquee";

export default function CMDashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  
  const [allAgencies, setAllAgencies] = useState<AssignedAgencyInfo[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<AssignedAgencyInfo[]>([]);
  const [newAgencies, setNewAgencies] = useState<AssignedAgencyInfo[]>([]); 
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  const monthOptions = useMemo(() => [
    { value: "all", label: "All Months" },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' })
    }))
  ], []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      { value: "all", label: "All Years" },
      ...Array.from({ length: 5 }, (_, i) => ({
        value: String(currentYear - i),
        label: String(currentYear - i)
      }))
    ];
  }, []);

  const fetchAssignedAgencies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getAssignedAgenciesForCMAction();
      
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result.success && result.agencies) {
        setAllAgencies(result.agencies);
        setFilteredAgencies(result.agencies);
        setNewAgencies(result.agencies.filter(a => a.assignment.viewedByAt === null && a.assignment.isActive));
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      console.error("Error fetching agencies:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load assigned agencies";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSessionPending) return;
    
    if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
      router.push('/profile');
      return;
    }

    fetchAssignedAgencies();
  }, [session, isSessionPending, router, fetchAssignedAgencies]);

  useEffect(() => {
    let agencies = [...allAgencies];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      agencies = agencies.filter(
        agency =>
          agency.name.toLowerCase().includes(query) ||
          agency.email.toLowerCase().includes(query)
      );
    }

    if (selectedMonth !== "all") {
      const month = parseInt(selectedMonth, 10);
      agencies = agencies.filter(agency => {
        const assignedDate = new Date(agency.assignment.assignedAt);
        return assignedDate.getMonth() + 1 === month;
      });
    }

    if (selectedYear !== "all") {
      const year = parseInt(selectedYear, 10);
      agencies = agencies.filter(agency => {
        const assignedDate = new Date(agency.assignment.assignedAt);
        return assignedDate.getFullYear() === year;
      });
    }

    setFilteredAgencies(agencies);
  }, [searchQuery, selectedMonth, selectedYear, allAgencies]);

  const handleAgencyClick = (agencyId: string) => {
    router.push(`/collectionManager/agencies/${agencyId}`);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDismissBanner = async () => {
    if (newAgencies.length === 0) return;
    setIsDismissing(true);
    
    const assignmentIds = newAgencies.map(a => a.assignment.id);
    const result = await markCMAssignmentsAsViewedAction(assignmentIds);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("New assignments marked as read.");
      setNewAgencies([]);
      setAllAgencies(prev => 
        prev.map(a => 
          assignmentIds.includes(a.assignment.id) 
            ? { ...a, assignment: { ...a.assignment, viewedByAt: new Date() } }
            : a
        )
      );
    }
    setIsDismissing(false);
  };

  if (isSessionPending) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-rose-900 mx-auto mb-3" />
          <div className="text-gray-600">Loading session...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen">
      <AdvisoryMarquee />
      
      {newAgencies.length > 0 && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/30">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <UserCheck className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-blue-900 dark:text-blue-200">New Agency Assignments</CardTitle>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-800"
                onClick={handleDismissBanner}
                disabled={isDismissing}
              >
                {isDismissing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Dismiss"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You have been assigned {newAgencies.length} new {newAgencies.length === 1 ? "agency" : "agencies"}: <strong>{newAgencies.map(a => a.name).join(", ")}</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collection Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor agencies assigned to you</p>
        </div>
        <ReturnButton href="/profile" label="Back to Profile" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Agency</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">Assignment Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Assignment Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Assigned Agencies</p>
                <p className="text-2xl font-bold text-gray-900">{allAgencies.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {allAgencies.reduce((sum, a) => sum + a.totalSubmissions, 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Forms</p>
                <p className="text-2xl font-bold text-orange-600">
                  {allAgencies.reduce((sum, a) => sum + a.pendingForms, 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Showing Results</p>
                <p className="text-2xl font-bold text-gray-900">{filteredAgencies.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-rose-900" />
          <span className="ml-3 text-gray-600">Loading assigned agencies...</span>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-700" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-800">Error loading agencies</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Button onClick={fetchAssignedAgencies} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredAgencies.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            {allAgencies.length === 0 ? (
              <>
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">No agencies assigned</p>
                <p className="text-gray-600 mt-2">No agencies are currently assigned to your profile.</p>
              </>
            ) : (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">No agencies found</p>
                <p className="text-gray-600 mt-2">Try adjusting your search or filter criteria.</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredAgencies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map((agency) => {
            const isActive = agency.assignment.isActive;
            return (
              <Card
                key={agency.id}
                className={cn(
                  "hover:shadow-lg transition-shadow border-2 flex flex-col",
                  isActive ? "hover:border-rose-900" : "opacity-60 bg-gray-50"
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "p-2 rounded-lg flex-shrink-0",
                        isActive ? "bg-rose-100" : "bg-gray-200"
                      )}>
                        <Building2 className={cn("h-5 w-5", isActive ? "text-rose-900" : "text-gray-600")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{agency.name}</CardTitle>
                        <p className="text-sm text-gray-600 truncate">{agency.email}</p>
                      </div>
                    </div>
                     <Badge variant={isActive ? "secondary" : "destructive"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm pt-3 border-t">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {isActive ? "Assigned On" : "Period"}
                      </span>
                      <span className="text-gray-900 font-semibold text-right">
                        {isActive 
                          ? formatDate(agency.assignment.assignedAt)
                          : `${formatDate(agency.assignment.assignedAt)} - ${formatDate(agency.assignment.updatedAt)}`
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Total Submissions
                      </span>
                      <span className="font-semibold text-gray-900">{agency.totalSubmissions}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending Forms
                      </span>
                      <span className={`font-semibold ${agency.pendingForms > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {agency.pendingForms}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Last Submission
                      </span>
                      <span className="text-gray-900 font-medium">
                        {formatDate(agency.lastSubmissionDate)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-rose-900 hover:bg-rose-800 text-white mt-4"
                    onClick={() => handleAgencyClick(agency.id)}
                    disabled={!isActive}
                  >
                    {isActive ? "View Details" : "Assignment Inactive"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}