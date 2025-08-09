// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FORM_CONFIGS } from "@/types/forms";
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  Settings,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { ReturnButton } from "@/components/return-button";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  currentMonth: number;
  currentYear: number;
  formSubmissions: {
    total: number;
    submitted: number;
    pending: number;
    overdue: number;
  };
}

async function getDashboardData(): Promise<DashboardData | null> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList
    });

    if (!session?.user) {
      return null;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // In a real implementation, you would fetch actual form submission data
    // For now, we'll use mock data
    const formSubmissions = {
      total: Object.keys(FORM_CONFIGS).length,
      submitted: 8,
      pending: 4,
      overdue: 2
    };

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      },
      currentMonth,
      currentYear,
      formSubmissions
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return null;
  }
}

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();

  if (!dashboardData) {
    redirect("/auth/login");
  }

  const { user, currentMonth, currentYear, formSubmissions } = dashboardData;

  // Get current month name
  const currentMonthName = new Date(0, currentMonth - 1).toLocaleDateString('en-US', { month: 'long' });

  // Calculate form categories
  const monthlyForms = Object.values(FORM_CONFIGS).filter(form => form.category === 'monthly');
  const annualForms = Object.values(FORM_CONFIGS).filter(form => form.category === 'annual');
  const requiredForms = Object.values(FORM_CONFIGS).filter(form => form.isRequired);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-8 py-16 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user.name}
              </p>
              <p className="text-sm text-gray-500">
                {currentMonthName} {currentYear} • Reporting Period
              </p>
            </div>
            
            <div className="flex gap-4">
              <ReturnButton href="/profile" label="Profile" />
              {user.role === 'ADMIN' && (
                <ReturnButton href="/admin/dashboard" label="Admin Panel" />
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Forms
                  </p>
                  <p className="text-2xl font-bold">{formSubmissions.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Submitted
                  </p>
                  <p className="text-2xl font-bold text-green-600">{formSubmissions.submitted}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">{formSubmissions.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Overdue
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formSubmissions.overdue}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Monthly Forms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                Monthly Forms
              </CardTitle>
              <CardDescription>
                Forms required for {currentMonthName} {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {monthlyForms.slice(0, 5).map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{form.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Due: {form.deadlineDay}th of each month
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.isRequired && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                    <Link href={`/forms/${form.id}`}>
                      <Button size="sm">Open</Button>
                    </Link>
                  </div>
                </div>
              ))}
              
              {monthlyForms.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    View All Monthly Forms
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your recent form submissions and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Code of Conduct</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Submitted 2 hours ago</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Monthly Compliance</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Saved as draft</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Agency Visits</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Needs review</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Quick Links
              </CardTitle>
              <CardDescription>
                Frequently accessed features and tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/approval-request">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Request Approval
                </Button>
              </Link>

              <Link href="/profile">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
              </Link>

              {user.role === 'ADMIN' && (
                <Link href="/admin/forms">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Review Submissions
                  </Button>
                </Link>
              )}

              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>

              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Form Templates
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* All Forms Grid */}
        <Card>
          <CardHeader>
            <CardTitle>All Available Forms</CardTitle>
            <CardDescription>
              Complete list of all forms available to your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(FORM_CONFIGS).map((form) => (
                <div
                  key={form.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{form.title}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {form.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Badge 
                        variant={form.category === 'monthly' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {form.category}
                      </Badge>
                      {form.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    
                    <Link href={`/forms/${form.id}`}>
                      <Button size="sm" className="h-7 text-xs">
                        Open
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Deadline: {form.deadlineDay}th of each month
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Important Notices */}
        <div className="mt-8">
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Important Reminders
                  </h3>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• Monthly forms must be submitted by the {FORM_CONFIGS.codeOfConduct?.deadlineDay || 5}th of each month</li>
                    <li>• Incomplete submissions will be automatically flagged for review</li>
                    <li>• Contact administrators if you need to modify submitted forms</li>
                    <li>• All form data is encrypted and securely stored</li>
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