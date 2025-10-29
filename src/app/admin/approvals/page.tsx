"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { UserRole, ApprovalStatus } from "@/generated/prisma";
import {
  getPendingApprovalRequestsAction,
  processApprovalRequestAction,
  requestDocumentAction,
  getApprovalStatisticsAction
} from "@/actions/approval-request.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle, XCircle, FileText, Search, FileQuestion, AlertCircle, Filter } from "lucide-react";
import { toast } from "sonner";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import Link from "next/link";

interface ApprovalRequest {
  id: string;
  formType: string;
  formId: string;
  requestType: string;
  reason: string;
  documentPath?: string | null;
  createdAt: Date;
  adminResponse?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Statistics {
  pending: number;
  approved: number;
  rejected: number;
  needingDocument: number;
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    pending: 0,
    approved: 0,
    rejected: 0,
    needingDocument: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminResponses, setAdminResponses] = useState<Record<string, string>>({});
  const [requestingDocId, setRequestingDocId] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [formTypeFilter, setFormTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchStatistics = useCallback(async () => {
    const result = await getApprovalStatisticsAction();
    if (!result.error && result.statistics) {
      setStatistics(result.statistics);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const result = await getPendingApprovalRequestsAction({
      status: statusFilter as ApprovalStatus,
      formType: formTypeFilter === "all" ? undefined : formTypeFilter,
      searchQuery: searchQuery || undefined
    });
    
    if (result.error) {
      toast.error(result.error);
    } else {
      setRequests(result.requests || []);
    }
    setIsLoading(false);
  }, [statusFilter, formTypeFilter, searchQuery]);

  useEffect(() => {
    if (isSessionPending) return;

    if (!session || session.user.role !== UserRole.ADMIN) {
      router.push("/profile");
      return;
    }

    fetchRequests();
    fetchStatistics();
  }, [session, isSessionPending, router, fetchRequests, fetchStatistics]);

  const handleProcess = async (requestId: string, approved: boolean) => {
    setProcessingId(requestId);
    const response = adminResponses[requestId] || "";
    
    const result = await processApprovalRequestAction(requestId, approved, response);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Request ${approved ? "approved" : "rejected"} successfully`);
      fetchRequests();
      fetchStatistics();
    }
    
    setProcessingId(null);
  };

  const handleRequestDocument = async (requestId: string) => {
    const message = adminResponses[requestId];
    
    if (!message || !message.trim()) {
      toast.error("Please provide a message explaining what document is needed");
      return;
    }

    setRequestingDocId(requestId);
    
    const result = await requestDocumentAction(requestId, message);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Document request sent to user");
      fetchRequests();
    }
    
    setRequestingDocId(null);
  };

  if (isSessionPending || isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading approval requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      {/* Header with Statistics */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Approval Requests</h1>
        <p className="text-gray-600 mb-6">Review and process form edit requests from agencies</p>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("PENDING")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("APPROVED")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("REJECTED")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">Need Document</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.needingDocument}</p>
                </div>
                <FileQuestion className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by agency name, email, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
            
            {showFilters && (
              <div className="flex gap-4 mt-4 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="All Form Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Form Types</SelectItem>
                    {Object.entries(FORM_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={() => {
                  setStatusFilter("PENDING");
                  setFormTypeFilter("all");
                  setSearchQuery("");
                }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Requests Found</h3>
            <p className="text-gray-600">
              {searchQuery || formTypeFilter !== "all"
                ? "Try adjusting your filters"
                : "No pending approval requests at the moment"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={`border-l-4 ${
              request.adminResponse && !request.documentPath
                ? 'border-l-orange-500 bg-orange-50'
                : 'border-l-yellow-500'
            }`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {FORM_CONFIGS[request.formType as FormType]?.title || request.formType}
                      </CardTitle>
                      {request.adminResponse && !request.documentPath && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          <FileQuestion className="h-3 w-3 mr-1" />
                          Document Requested
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <Link 
                        href={`/admin/users/${request.user.id}`}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {request.user.name}
                      </Link>
                      <span>{request.user.email}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(request.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
                      {request.requestType.replace(/_/g, ' ')}
                    </Badge>
                    <Link href={`/forms/${request.formType}/${request.formId}`}>
                      <Button size="sm" variant="ghost">
                        View Form
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Reason for Request:</h4>
                  <p className="text-gray-600 bg-white p-3 rounded-md border">{request.reason}</p>
                </div>

                {request.documentPath && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Supporting Document:</h4>
                    <Button variant="outline" size="sm" asChild>
                      <a href={request.documentPath} target="_blank" rel="noopener noreferrer">
                        View Document
                      </a>
                    </Button>
                  </div>
                )}

                {request.adminResponse && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="font-semibold text-sm text-blue-900 mb-1">Previous Admin Response:</h4>
                    <p className="text-blue-800 text-sm">{request.adminResponse}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Admin Response:</h4>
                  <Textarea
                    placeholder="Add a note, request document, or explain your decision..."
                    value={adminResponses[request.id] || ""}
                    onChange={(e) => setAdminResponses({
                      ...adminResponses,
                      [request.id]: e.target.value
                    })}
                    className="min-h-[80px]"
                    disabled={processingId === request.id || requestingDocId === request.id}
                  />
                </div>

                {statusFilter === "PENDING" && (
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRequestDocument(request.id)}
                      disabled={processingId === request.id || requestingDocId === request.id}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <FileQuestion className="h-4 w-4 mr-2" />
                      Request Document
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleProcess(request.id, false)}
                      disabled={processingId === request.id || requestingDocId === request.id}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    
                    <Button
                      onClick={() => handleProcess(request.id, true)}
                      disabled={processingId === request.id || requestingDocId === request.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Info */}
      {requests.length >= 100 && (
        <Card className="mt-4">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 inline mr-2" />
            <span className="text-sm text-gray-600">
              Showing first 100 results. Use filters to narrow down your search.
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}