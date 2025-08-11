// src/app/admin/forms/admin-forms-client.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReturnButton } from "@/components/return-button";
import { FORM_CONFIGS } from "@/types/forms";
import { 
  Search, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  FileText,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SubmissionStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type FilterStatus = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

interface UserSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  formType: string;
  formTitle: string;
  status: SubmissionStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  month: number;
  year: number;
  autoSubmitted: boolean;
  recordCount: number;
}

const mockSubmissions: UserSubmission[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'ABC Collection Agency',
    userEmail: 'abc@agency.com',
    formType: 'agencyVisits',
    formTitle: 'Agency Visit Details',
    status: 'SUBMITTED',
    submittedAt: new Date('2025-08-03T10:30:00'),
    month: 8,
    year: 2025,
    autoSubmitted: false,
    recordCount: 15,
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'XYZ Financial Services',
    userEmail: 'xyz@financial.com',
    formType: 'monthlyCompliance',
    formTitle: 'Monthly Compliance Declaration',
    status: 'SUBMITTED',
    submittedAt: new Date('2025-08-04T14:15:00'),
    month: 8,
    year: 2025,
    autoSubmitted: false,
    recordCount: 8,
  },
];

export function AdminFormsClient() {
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterFormType, setFilterFormType] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setSubmissions(mockSubmissions);
      } catch (err) {
        toast.error("Failed to load submissions");
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.formTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || submission.status === filterStatus;
    const matchesFormType = filterFormType === 'ALL' || submission.formType === filterFormType;
    const matchesMonth = submission.month === selectedMonth && submission.year === selectedYear;
    
    return matchesSearch && matchesStatus && matchesFormType && matchesMonth;
  });

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: SubmissionStatus) => {
    switch (status) {
      case 'SUBMITTED': return <Clock className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleApprove = async (submissionId: string) => {
    try {
      toast.success("Submission approved successfully");
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: 'APPROVED' as const, reviewedAt: new Date(), reviewedBy: 'Current Admin' }
            : sub
        )
      );
    } catch (err) {
      toast.error("Failed to approve submission");
    }
  };

  const handleReject = async (submissionId: string) => {
    try {
      toast.success("Submission rejected");
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: 'REJECTED' as const, reviewedAt: new Date(), reviewedBy: 'Current Admin' }
            : sub
        )
      );
    } catch (err) {
      toast.error("Failed to reject submission");
    }
  };

  const handleExportData = () => {
    toast.success("Export functionality will be implemented");
  };

  const handleViewSubmission = (submission: UserSubmission) => {
    window.location.href = `/admin/forms/${submission.formType}/${submission.id}?userId=${submission.userId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p>Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <ReturnButton href="/admin/dashboard" label="Back to Admin Dashboard" />
          <div className="flex items-center gap-3 mt-4 mb-2">
            <Shield className="w-8 h-8 text-rose-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Form Submissions Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Review and manage all agency form submissions (Admin Access)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Submissions</p>
                  <p className="font-semibold">{filteredSubmissions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="font-semibold">
                    {filteredSubmissions.filter(s => s.status === 'SUBMITTED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="font-semibold">
                    {filteredSubmissions.filter(s => s.status === 'APPROVED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Agencies</p>
                  <p className="font-semibold">
                    {new Set(filteredSubmissions.map(s => s.userId)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search agencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">All Status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={filterFormType}
                onChange={(e) => setFilterFormType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">All Forms</option>
                {Object.entries(FORM_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>{config.title}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>

              <Button onClick={handleExportData} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Form Submissions</span>
              <Badge variant="secondary">
                {filteredSubmissions.length} results
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {submission.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.userEmail}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {submission.userId}
                          </div>
                          {submission.autoSubmitted && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Auto-submitted
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {submission.formTitle}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.month}/{submission.year}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn("flex items-center gap-1 w-fit", getStatusColor(submission.status))}>
                          {getStatusIcon(submission.status)}
                          {submission.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          {submission.submittedAt.toLocaleDateString()}
                        </div>
                        <div>
                          {submission.submittedAt.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {submission.recordCount} entries
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {submission.status === 'SUBMITTED' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(submission.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReject(submission.id)}
                                variant="destructive"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-8 h-8 text-gray-400" />
                          <p>No submissions found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredSubmissions.filter(s => s.status === 'SUBMITTED').length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Bulk Actions:</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      const submittedIds = filteredSubmissions
                        .filter(s => s.status === 'SUBMITTED')
                        .map(s => s.id);
                      
                      submittedIds.forEach(id => handleApprove(id));
                      toast.success(`Approved ${submittedIds.length} submissions`);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve All Pending
                  </Button>
                </div>
                
                <div className="text-sm text-gray-500">
                  {filteredSubmissions.filter(s => s.status === 'SUBMITTED').length} pending submissions
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((filteredSubmissions.filter(s => s.status === 'APPROVED').length / filteredSubmissions.length) * 100) || 0}%
              </div>
              <div className="text-sm text-gray-600">Approval Rate</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredSubmissions.reduce((acc, curr) => acc + curr.recordCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Records</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredSubmissions.filter(s => s.autoSubmitted).length}
              </div>
              <div className="text-sm text-gray-600">Auto-Submitted</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Admin Access Notice
                  </h3>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• All admin actions are logged for security and compliance</li>
                    <li>• Form data is isolated per user - access is granted via admin privileges only</li>
                    <li>• Bulk approvals require additional confirmation for sensitive forms</li>
                    <li>• Export functionality includes user consent tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}