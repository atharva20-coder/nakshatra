"use client";

import React, { useState, useEffect } from "react";
import { getUnreadAnnouncementsForUserAction, markAnnouncementAsReadAction } from "@/actions/announcement.action";
import { Button } from "@/components/ui/button";
import { Megaphone, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
}

export function AdvisoryMarquee() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAdvisory, setCurrentAdvisory] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length > 0 && !currentAdvisory) {
      // Load the next advisory
      setCurrentAdvisory(announcements[0]);
    }
  }, [announcements, currentAdvisory]);

  const fetchAnnouncements = async () => {
    const result = await getUnreadAnnouncementsForUserAction();
    if (result.success && result.announcements) {
      setAnnouncements(result.announcements);
    }
  };

  const handleDismiss = async () => {
    if (!currentAdvisory) return;

    const id = currentAdvisory.id;
    
    // Optimistically remove from UI
    const remaining = announcements.filter(a => a.id !== id);
    setAnnouncements(remaining);
    setCurrentAdvisory(remaining[0] || null); // Load the next one
    
    const result = await markAnnouncementAsReadAction(id);
    if (result.error) {
      toast.error("Failed to mark advisory as read. It may appear again.");
      fetchAnnouncements(); // Re-fetch to correct UI
    }
  };

  if (!currentAdvisory) {
    return null;
  }

  // Combine title and content for scrolling
  const advisoryText = `${currentAdvisory.title}: ${currentAdvisory.content}`;

  return (
    <div className="mb-4 w-full bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 rounded-lg flex items-center pr-2">
      <div className="flex-shrink-0 px-4">
        <Megaphone className="h-5 w-5 text-blue-600" />
      </div>
      
      {/* Marquee container */}
      <div className="flex-1 overflow-hidden h-12 flex items-center">
        <span className="marquee-text text-sm font-medium text-blue-800 dark:text-blue-200">
          {advisoryText}
        </span>
      </div>
      
      {/* Actions */}
      <div className="flex-shrink-0 flex items-center space-x-2 pl-4">
        <Button asChild size="sm" variant="link">
           <Link href="/user/advisories">View All</Link>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-blue-700"
          onClick={handleDismiss}
          title="Dismiss this advisory"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}