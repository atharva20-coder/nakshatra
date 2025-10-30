// src/app/collectionManager/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getCMAgenciesAction } from "@/actions/collection-manager.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Calendar, FileText, Clock, Loader2, TrendingUp } from "lucide-react";
import { UserRole } from "@/generated/prisma";

interface AgencyBasicInfo {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastSubmissionDate: Date | null;
  totalSubmissions: number;
  pendingForms: number;
}

export default function CMDashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  
  const [agencies, setAgencies] = useState<AgencyBasicInfo[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<AgencyBasicInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch agencies on mount
  useEffect(() => {
    if (isSessionPending) return;
    
    if (!session || session.user.role !== UserRole.COLLECTION_MANAGER) {
      router.push('/profile');
      return;
    }

    fetchAgencies();
  }, [session, isSessionPending, router]);

  // Filter agencies when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAgencies(agencies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = agencies.filter(
        agency =>
          agency.name.toLowerCase().includes(query) ||
          agency.email.toLowerCase().includes(query)
      );
      setFilteredAgencies(filtered);
    }
  }, [searchQuery, agencies]);

  const fetchAgencies = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getCMAgenciesAction();
      
      if (result.error) {
        setError(result.error);
      } else if (result.success && result.agencies) {
        setAgencies(result.agencies);
        setFilteredAgencies(result.agencies);
      }
    } catch (err) {
      console.error("Error fetching agencies:", err);
      setError("Failed to load agencies");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgencyClick = (agencyId: string) => {
    router.push(`/collectionManager/agencies/${agencyId}`);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityStatus = (agency: AgencyBasicInfo) => {
    if (!agency.lastSubmissionDate) return { text: "Inactive", color: "bg-gray-100 text-gray-800" };
    
    const daysSinceLastSubmission = Math.floor(
      (Date.now() - new Date(agency.lastSubmissionDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastSubmission <= 7) return { text: "Active", color: "bg-green-100 text-green-800" };
    if (daysSinceLastSubmission <= 30) return { text: "Moderate", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Low Activity", color: "bg-orange-100 text-orange-800" };
  };

  if (isSessionPending) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-rose-900 mx-auto mb-3" />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collection Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and review agency submissions</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search agencies by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Agencies</p>
                  <p className="text-2xl font-bold text-gray-900">{agencies.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Agencies</p>
                  <p className="text-2xl font-bold text-green-600">
                    {agencies.filter(a => {
                      if (!a.lastSubmissionDate) return false;
                      const days = Math.floor((Date.now() - new Date(a.lastSubmissionDate).getTime()) / (1000 * 60 * 60 * 24));
                      return days <= 7;
                    }).length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {agencies.reduce((sum, a) => sum + a.totalSubmissions, 0)}
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
                    {agencies.reduce((sum, a) => sum + a.pendingForms, 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-rose-900" />
          <span className="ml-3 text-gray-600">Loading agencies...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800 text-center">{error}</p>
            <div className="mt-4 text-center">
              <Button onClick={fetchAgencies} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredAgencies.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">No agencies found</p>
                <p className="text-gray-600 mt-2">Try adjusting your search criteria</p>
              </>
            ) : (
              <>
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">No agencies available</p>
                <p className="text-gray-600 mt-2">No agencies have been registered yet</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agency Cards Grid */}
      {!isLoading && !error && filteredAgencies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map((agency) => {
            const activityStatus = getActivityStatus(agency);
            
            return (
              <Card
                key={agency.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-rose-900"
                onClick={() => handleAgencyClick(agency.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-rose-100 p-2 rounded-lg flex-shrink-0">
                        <Building2 className="h-5 w-5 text-rose-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{agency.name}</CardTitle>
                        <p className="text-sm text-gray-600 truncate">{agency.email}</p>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${activityStatus.color} mt-2 w-fit`}>
                    {activityStatus.text}
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-3">
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

                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Submission
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(agency.lastSubmissionDate)}
                    </span>
                  </div>

                  <Button 
                    className="w-full bg-rose-900 hover:bg-rose-800 text-white mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgencyClick(agency.id);
                    }}
                  >
                    View Details →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && !error && filteredAgencies.length > 0 && (
        <div className="text-center text-sm text-gray-600 pt-4">
          Showing {filteredAgencies.length} of {agencies.length} agencies
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  );
}