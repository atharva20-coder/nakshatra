"use client";

import React, { useState, useEffect } from "react";
import { getActivityLogsAction } from "@/actions/notification.action";
import { ActivityAction } from "@/generated/prisma";
import { Clock, FileText, CheckCircle, XCircle, Upload, Trash2, Settings, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityLog {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const result = await getActivityLogsAction(50);
    if (!result.error && result.logs) {
      setLogs(result.logs);
    }
    setIsLoading(false);
  };

  const getActionIcon = (action: ActivityAction) => {
    switch (action) {
      case "FORM_CREATED":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "FORM_UPDATED":
        return <FileText className="h-4 w-4 text-yellow-600" />;
      case "FORM_SUBMITTED":
      case "FORM_RESUBMITTED":
        return <Upload className="h-4 w-4 text-green-600" />;
      case "FORM_DELETED":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "APPROVAL_REQUESTED":
        return <Clock className="h-4 w-4 text-purple-600" />;
      case "APPROVAL_GRANTED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "APPROVAL_REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "DOCUMENT_UPLOADED":
        return <Upload className="h-4 w-4 text-blue-600" />;
      case "USER_LOGIN":
        return <LogIn className="h-4 w-4 text-green-600" />;
      case "USER_LOGOUT":
        return <LogOut className="h-4 w-4 text-gray-600" />;
      case "SETTINGS_CHANGED":
        return <Settings className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: ActivityAction) => {
    switch (action) {
      case "FORM_CREATED":
        return "bg-blue-100 text-blue-800";
      case "FORM_UPDATED":
        return "bg-yellow-100 text-yellow-800";
      case "FORM_SUBMITTED":
      case "FORM_RESUBMITTED":
        return "bg-green-100 text-green-800";
      case "FORM_DELETED":
        return "bg-red-100 text-red-800";
      case "APPROVAL_REQUESTED":
        return "bg-purple-100 text-purple-800";
      case "APPROVAL_GRANTED":
        return "bg-green-100 text-green-800";
      case "APPROVAL_REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatAction = (action: ActivityAction) => {
    return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="activity">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Logs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your recent actions and activities
            </p>
          </div>
          <Badge variant="secondary">{logs.length} activities</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activity logs yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className="flex gap-4 pb-4 border-b last:border-b-0"
                >
                  {/* Timeline line */}
                  <div className="relative flex flex-col items-center">
                    <div className="rounded-full bg-white border-2 border-gray-200 p-2">
                      {getActionIcon(log.action)}
                    </div>
                    {index !== logs.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`${getActionColor(log.action)} text-xs`}
                          >
                            {formatAction(log.action)}
                          </Badge>
                          {log.entityType && (
                            <span className="text-xs text-gray-500">
                              {log.entityType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                        {log.metadata && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              View details
                            </summary>
                            <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {getTimeAgo(log.createdAt)}
                      </span>
                    </div>
                    {log.ipAddress && (
                      <div className="mt-2 text-xs text-gray-400">
                        IP: {log.ipAddress}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}