// src/components/super-admin/AnnouncementManager.tsx
"use client";

import React, { useState, useTransition } from "react";
import { 
  createAnnouncementAction, 
  deleteAnnouncementAction, 
  getAnnouncementsForSuperAdminAction 
} from "@/actions/announcement.action";
import { UserRole } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Trash2, Megaphone, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// Get the full union return type from the server action
type GetAnnouncementsReturn = Awaited<ReturnType<typeof getAnnouncementsForSuperAdminAction>>;

// Extract only the successful return type from the union
type SuccessAnnouncementsReturn = Extract<GetAnnouncementsReturn, { success: true }>;

// Infer the type of a single announcement from the array
type Announcement = SuccessAnnouncementsReturn["data"] extends (infer U)[]
  ? U
  : never;

interface AnnouncementManagerProps {
  initialAnnouncements: Announcement[];
}

const allRoles = [
  { id: UserRole.ADMIN, label: "Admins" },
  { id: UserRole.USER, label: "Agencies" },
  { id: UserRole.AUDITOR, label: "Auditors" },
  { id: UserRole.COLLECTION_MANAGER, label: "Collection Managers" },
];

export function AnnouncementManager({ initialAnnouncements }: AnnouncementManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<UserRole[]>([]);

  const handleAudienceChange = (role: UserRole, checked: boolean) => {
    setAudience(prev => 
      checked ? [...prev, role] : prev.filter(r => r !== role)
    );
  };

  const handleCreate = () => {
    if (!title || !content || audience.length === 0) {
      toast.error("Please fill in title, content, and select at least one audience.");
      return;
    }

    startTransition(async () => {
      const result = await createAnnouncementAction({ title, content, audience });
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Announcement created successfully!");
        setTitle("");
        setContent("");
        setAudience([]);
        // Manually update client state to show new announcement immediately
        const newAnnouncement = {
          ...result.data,
          author: { name: "You" }, // Placeholder for immediate UI update
          _count: { readBy: 0 }
        } as Announcement;
        setAnnouncements(prev => [newAnnouncement, ...prev]);
        router.refresh(); // Re-fetch server components in background
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    startTransition(async () => {
      const result = await deleteAnnouncementAction(id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Announcement deleted.");
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    });
  };

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
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content (Advisory)</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} disabled={isPending} rows={6} />
          </div>
          <div className="space-y-3">
            <Label>Audience</Label>
            <div className="grid grid-cols-2 gap-3">
              {allRoles.map(role => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={role.id}
                    checked={audience.includes(role.id)}
                    onCheckedChange={(checked) => handleAudienceChange(role.id, !!checked)}
                    disabled={isPending}
                  />
                  <label htmlFor={role.id} className="text-sm font-medium">{role.label}</label>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={isPending} className="w-full">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </CardContent>
      </Card>

      {/* Existing Announcements List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Published Announcements</CardTitle>
          <CardDescription>List of all previously created announcements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No announcements found.</p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="border p-4 rounded-lg bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{ann.title}</h4>
                    <p className="text-xs text-gray-500">
                      By {ann.author.name} on {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" size="icon" className="text-red-500"
                    onClick={() => handleDelete(ann.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm mt-3 mb-3">{ann.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {ann.audience.map((role) => (
                      <Badge key={role} variant="secondary">{role}</Badge>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{ann._count.readBy} Read(s)</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}