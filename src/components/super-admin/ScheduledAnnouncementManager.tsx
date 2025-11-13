"use client";

import React, { useState, useTransition } from "react";
import {
  createScheduledAnnouncementAction,
  cancelScheduledAnnouncementAction,
  publishScheduledAnnouncementNowAction,
  getAllAnnouncementsForSuperAdminAction,
} from "@/actions/scheduled-announcement.action";
import { UserRole, Announcement } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  Megaphone,
  Send,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GetAnnouncementsReturn = Awaited<
  ReturnType<typeof getAllAnnouncementsForSuperAdminAction>
>;
type SuccessAnnouncementsReturn = Extract<GetAnnouncementsReturn, { success: true }>;
type AnnouncementWithDetails = SuccessAnnouncementsReturn["data"] extends (infer U)[]
  ? U
  : never;

interface ScheduledAnnouncementManagerProps {
  initialAnnouncements: AnnouncementWithDetails[];
}

const allRoles = [
  { id: UserRole.ADMIN, label: "Admins" },
  { id: UserRole.USER, label: "Agencies" },
  { id: UserRole.AUDITOR, label: "Auditors" },
  { id: UserRole.COLLECTION_MANAGER, label: "Collection Managers" },
];

export function ScheduledAnnouncementManager({
  initialAnnouncements,
}: ScheduledAnnouncementManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<UserRole[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleAudienceChange = (role: UserRole, checked: boolean) => {
    setAudience((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role)
    );
  };

  const handleCreate = () => {
    if (!title || !content || audience.length === 0) {
      toast.error("Please fill in title, content, and select at least one audience.");
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      toast.error("Please provide both date and time for scheduled announcements.");
      return;
    }

    startTransition(async () => {
      let scheduledFor: Date | undefined;
      if (isScheduled) {
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduledFor <= new Date()) {
          toast.error("Scheduled time must be in the future.");
          return;
        }
      }

      const result = await createScheduledAnnouncementAction({
        title,
        content,
        audience,
        isScheduled,
        scheduledFor,
      });

      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(
          isScheduled
            ? "Announcement scheduled successfully!"
            : "Announcement published successfully!"
        );

        setTitle("");
        setContent("");
        setAudience([]);
        setIsScheduled(false);
        setScheduledDate("");
        setScheduledTime("");

        const now = new Date();
        const newAnnouncement = {
          ...result.data,
          author: { name: "You" },
          _count: { readBy: 0 },
          formattedScheduledFor: result.data.scheduledFor
            ? new Date(result.data.scheduledFor)
                .toISOString()
                .replace("T", " ")
                .slice(0, 16)
            : null,
          formattedPublishedAt: result.data.publishedAt
            ? new Date(result.data.publishedAt)
                .toISOString()
                .replace("T", " ")
                .slice(0, 16)
            : null,
        } as AnnouncementWithDetails;

        setAnnouncements((prev) => [newAnnouncement, ...prev]);
        router.refresh();
      }
    });
  };

  const handleCancel = (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled announcement?"))
      return;

    startTransition(async () => {
      const result = await cancelScheduledAnnouncementAction(id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Scheduled announcement cancelled.");
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    });
  };

  const handlePublishNow = (id: string) => {
    if (!confirm("Publish this announcement immediately?")) return;

    startTransition(async () => {
      const result = await publishScheduledAnnouncementNowAction(id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Announcement published immediately!");
        const now = new Date();
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  isPublished: true,
                  publishedAt: now,
                  formattedPublishedAt: now
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 16),
                }
              : a
          )
        );
        router.refresh();
      }
    });
  };

  const publishedAnnouncements = announcements.filter((a) => a.isPublished);
  const scheduledAnnouncements = announcements.filter(
    (a) => !a.isPublished && a.isScheduled
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Form */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content (Advisory)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPending}
              rows={6}
            />
          </div>

          {/* Audience */}
          <div className="space-y-3">
            <Label>Audience</Label>
            <div className="grid grid-cols-2 gap-3">
              {allRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.id}
                    checked={audience.includes(role.id)}
                    onCheckedChange={(checked) =>
                      handleAudienceChange(role.id, !!checked)
                    }
                    disabled={isPending}
                  />
                  <label htmlFor={role.id} className="text-sm font-medium">
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-toggle">Schedule for Later</Label>
                <p className="text-xs text-muted-foreground">
                  Publish at a specific date and time
                </p>
              </div>
              <Switch
                id="schedule-toggle"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
                disabled={isPending}
              />
            </div>

            {isScheduled && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date
                  </Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={isPending}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Time
                  </Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleCreate} disabled={isPending} className="w-full">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isScheduled ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
          <CardDescription>
            Manage published and scheduled announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="published">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="published">
                Published ({publishedAnnouncements.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled ({scheduledAnnouncements.length})
              </TabsTrigger>
            </TabsList>

            {/* Published */}
            <TabsContent value="published" className="space-y-4 mt-4">
              {publishedAnnouncements.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No published announcements.
                </p>
              ) : (
                publishedAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="border p-4 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{ann.title}</h4>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          Published:{" "}
                          {ann.formattedPublishedAt ??
                            (ann.publishedAt
                              ? new Date(ann.publishedAt)
                                  .toISOString()
                                  .replace("T", " ")
                                  .slice(0, 16)
                              : "N/A")}
                        </p>
                        <p className="text-sm mb-3">{ann.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {ann.audience.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {ann._count.readBy} Read(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Scheduled */}
            <TabsContent value="scheduled" className="space-y-4 mt-4">
              {scheduledAnnouncements.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No scheduled announcements.
                </p>
              ) : (
                scheduledAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="border-2 border-blue-200 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{ann.title}</h4>
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        </div>
                        <p className="text-xs text-blue-700 mb-3 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Will publish:{" "}
                          {ann.formattedScheduledFor ??
                            (ann.scheduledFor
                              ? new Date(ann.scheduledFor)
                                  .toISOString()
                                  .replace("T", " ")
                                  .slice(0, 16)
                              : "N/A")}
                        </p>
                        <p className="text-sm mb-3">{ann.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {ann.audience.map((role) => (
                            <Badge key={role} variant="secondary">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublishNow(ann.id)}
                          disabled={isPending}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Publish Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(ann.id)}
                          disabled={isPending}
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
