// src/components/AdvisoryMarquee.tsx
"use client";

import React, { useState, useEffect } from "react";
import { getUnreadAnnouncementsForUserAction, markAnnouncementAsReadAction } from "@/actions/announcement.action";
import { Button } from "@/components/ui/button";
import { Megaphone, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

export function AdvisoryMarquee() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Auto-rotate through announcements every 8 seconds
  useEffect(() => {
    if (announcements.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [announcements.length]);

  const fetchAnnouncements = async () => {
    const result = await getUnreadAnnouncementsForUserAction();
    if (result.success && result.data) {
      setAnnouncements(result.data);
      setIsVisible(result.data.length > 0);
    }
  };

  const handleDismiss = async () => {
    if (announcements.length === 0) return;
    
    const currentAnnouncement = announcements[currentIndex];
    
    // Optimistically remove from UI
    const remaining = announcements.filter((_, idx) => idx !== currentIndex);
    setAnnouncements(remaining);
    
    if (remaining.length === 0) {
      setIsVisible(false);
    } else {
      // Adjust index if we removed the last item
      setCurrentIndex(prev => Math.min(prev, remaining.length - 1));
    }
    
    // Mark as read in backend
    const result = await markAnnouncementAsReadAction(currentAnnouncement.id);
    if (!result.success) {
      toast.error("Failed to dismiss advisory");
      fetchAnnouncements(); // Re-fetch to correct UI
    }
  };

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 border-y border-blue-700 shadow-lg">
      <div className="flex items-center px-4 py-3">
        {/* Icon */}
        <div className="flex-shrink-0 mr-3">
          <div className="p-2 bg-white/20 rounded-full animate-pulse">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
              Advisory
            </span>
            {announcements.length > 1 && (
              <span className="text-xs text-white/70">
                ({currentIndex + 1} of {announcements.length})
              </span>
            )}
          </div>
          
          {/* Animated Text */}
          <div className="overflow-hidden">
            <div 
              key={currentAnnouncement.id}
              className="animate-fade-in"
            >
              <p className="text-white font-medium text-sm mb-1">
                {currentAnnouncement.title}
              </p>
              <p className="text-white/90 text-xs line-clamp-2">
                {currentAnnouncement.content}
              </p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2 ml-4">
          <Button 
            asChild 
            size="sm" 
            variant="ghost"
            className="text-white hover:bg-white/20 transition-colors"
          >
            <Link href="/user/advisories" className="flex items-center gap-1">
              <span className="hidden sm:inline">View All</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white hover:bg-white/20 transition-colors"
            onClick={handleDismiss}
            title="Dismiss this advisory"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Indicator (if multiple announcements) */}
      {announcements.length > 1 && (
        <div className="flex gap-1 px-4 pb-2">
          {announcements.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 flex-1 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'bg-white' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`View announcement ${idx + 1}`}
            />
          ))}
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}