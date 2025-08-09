// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FORM_CONFIGS, FormSubmissionStatus, isFormOverdue } from "@/types/forms";
import { Calendar, Clock, AlertTriangle, CheckCircle, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Mock data - in real implementation, this would come from your API
const mockFormStatuses: FormSubmissionStatus[] = [
  {
    formType: 'codeOfConduct',
    month: 8,
    year: 2025,
    status: 'DRAFT',
    autoSubmitted: false,
    canEdit: true,
    needsApproval: false,
  },
  {
    formType: 'agencyVisits',
    month: 8,
    year: 2025,
    status: 'SUBMITTED',
    submittedAt: new Date('2025-08-03'),
    autoSubmitted: false,
    canEdit: false,
    needsApproval: false,
  },
  {
    formType: 'monthlyCompliance',
    month: 8,
    year: 2025,
    status: 'DRAFT',
    autoSubmitted: false,
    canEdit: true,
    needsApproval: false,
  },
  // Add more mock data for other forms...
];

export default function DashboardPage() {
  const [formStatuses, setFormStatuses] = useState<FormSubmissionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Load form statuses from API
    const loadFormStatuses = async () => {
      try {
        // In real implementation, fetch from your API
        setFormStatuses(mockFormStatuses);
      } catch (err) {
        toast.error("Failed to load form statuses");
      } finally {
        setIsLoading(false);
      }
    };

    loadFormStatuses();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="w-4 h-4" />;
      case 'SUBMITTED': return <Upload className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getDaysUntilDeadline = (deadlineDay: number) => {
    const deadline = new Date(currentYear, currentMonth - 1, deadlineDay);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Agency Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your monthly submissions and compliance forms
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Current Month</p>
                    <p className="font-semibold">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-semibold">
                      {formStatuses.filter(f => f.status === 'SUBMITTED').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="font-semibold">
                      {formStatuses.filter(f => f.status === 'DRAFT').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Days to Deadline</p>
                    <p className="font-semibold">
                      {getDaysUntilDeadline(5)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(FORM_CONFIGS).map(([formKey, config]) => {
            const formStatus = formStatuses.find(f => f.formType === formKey);
            const daysUntilDeadline = getDaysUntilDeadline(config.deadlineDay);
            const isOverdue = daysUntilDeadline < 0;
            const isUrgent = daysUntilDeadline <= 2 && daysUntilDeadline >= 0;

            return (
              <Card 
                key={formKey} 
                className={cn(
                  "hover:shadow-lg transition-shadow cursor-pointer",
                  isOverdue && "border-red-300 bg-red-50",
                  isUrgent && "border-yellow-300 bg-yellow-50"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold mb-1">
                        {config.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {config.description}
                      </CardDescription>
                    </div>
                    
                    {config.isRequired && (
                      <Badge variant="secondary" className="ml-2">
                        Required
                      </Badge>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className={cn("flex items-center gap-1", getStatusColor(formStatus?.status || 'DRAFT'))}>
                      {getStatusIcon(formStatus?.status || 'DRAFT')}
                      {formStatus?.status || 'Not Started'}
                    </Badge>
                    
                    {isOverdue && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </Badge>
                    )}
                    
                    {isUrgent && (
                      <Badge variant="outline" className="flex items-center gap-1 border-yellow-400 text-yellow-700">
                        <Clock className="w-3 h-3" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Deadline Info */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Deadline: {config.deadlineDay}th of each month
                        {daysUntilDeadline >= 0 && ` (${daysUntilDeadline} days left)`}
                      </span>
                    </div>
                    
                    {/* Last Updated */}
                    {formStatus?.submittedAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          Submitted: {new Date(formStatus.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        asChild 
                        size="sm" 
                        className="flex-1"
                        variant={formStatus?.status === 'DRAFT' ? 'default' : 'outline'}
                      >
                        <Link href={`/forms/${formKey}`}>
                          {formStatus?.status === 'DRAFT' ? 'Continue' : 'View'}
                        </Link>
                      </Button>
                      
                      {formStatus?.status === 'SUBMITTED' && formStatus.canEdit && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            // Navigate to approval request page
                            window.location.href = `/approval-request?formType=${formKey}&formId=${formStatus.formType}`;
                          }}
                        >
                          Request Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Emergency Notice */}
        {getDaysUntilDeadline(5) <= 1 && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Urgent: Submission Deadline Approaching</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Monthly forms must be submitted by the 5th. Incomplete forms will be auto-submitted after the deadline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}