// src/components/enhanced-activity-logs.tsx
"use client";

import React, { useState, useEffect } from "react";
import { getUserActivityLogsAction } from "@/actions/activity-logging.action";
import { ActivityAction } from "@/generated/prisma";
import { Clock, FileText, CheckCircle, XCircle, Upload, Trash2, Settings, LogIn, LogOut, Edit, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface ActivityLog {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface EnhancedActivityLogsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function EnhancedActivityLogs({ userId, isOwnProfile = true }: EnhancedActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    const result = await getUserActivityLogsAction(userId, 100);
    if (!result.error && result.logs) {
      setLogs(
        result.logs.map((log) => ({
          ...log,
          metadata: typeof log.metadata === "object" && log.metadata !== null && !Array.isArray(log.metadata)
            ? (log.metadata as Record<string, unknown>)
            : undefined,
        }))
      );
    }
    setIsLoading(false);
  };

  const getActionIcon = (action: ActivityAction) => {
    switch (action) {
      case "FORM_CREATED":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "FORM_UPDATED":
        return <Edit className="h-4 w-4 text-yellow-600" />;
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
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: ActivityAction) => {
    switch (action) {
      case "FORM_CREATED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "FORM_UPDATED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "FORM_SUBMITTED":
      case "FORM_RESUBMITTED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "FORM_DELETED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "APPROVAL_REQUESTED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "APPROVAL_GRANTED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "APPROVAL_REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
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

  // All logs are shown without filtering

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{isOwnProfile ? "Your Activity" : "Activity Logs"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isOwnProfile ? "Track your recent actions and activities" : "View user's activity history"}
            </p>
          </div>
          <Badge variant="secondary">{logs.length} activities</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className="flex gap-4 pb-4 border-b last:border-b-0 dark:border-gray-700"
                >
                  {/* Timeline line */}
                  <div className="relative flex flex-col items-center">
                    <div className="rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 p-2">
                      {getActionIcon(log.action)}
                    </div>
                    {index !== logs.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="secondary"
                            className={`${getActionColor(log.action)} text-xs`}
                          >
                            {formatAction(log.action)}
                          </Badge>
                          {log.entityType && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {log.entityType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {log.description}
                        </p>

                        {/* Show other metadata */}
                        {log.metadata && !log.metadata.oldValues && !log.metadata.newValues && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                              Additional details
                            </summary>
                            <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {getTimeAgo(log.createdAt)}
                      </span>
                    </div>
                    {log.ipAddress && (
                      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
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