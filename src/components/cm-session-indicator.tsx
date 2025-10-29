"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, LogOut, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cmLogoutFromAgencySessionAction, checkCMSessionAction } from "@/actions/cm-session.action";
import CMLoginModal from "@/components/cm-login-modal";

interface CMSessionIndicatorProps {
  onSessionChange?: (sessionId: string | null) => void;
}

export function CMSessionIndicator({ onSessionChange }: CMSessionIndicatorProps) {
  const [cmSession, setCMSession] = useState<{
    sessionId: string;
    cmName: string;
    cmEmail: string;
    productTag: string;
    remainingMinutes: number;
  } | null>(null);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check session status periodically
  useEffect(() => {
    if (!cmSession) return;

    const interval = setInterval(async () => {
      const result = await checkCMSessionAction(cmSession.sessionId);
      
      if (!result.active) {
        toast.error("Collection Manager session expired");
        setCMSession(null);
        onSessionChange?.(null);
      } else {
        setCMSession(prev => prev ? { 
          ...prev, 
          remainingMinutes: result.remainingMinutes || 0 
        } : null);

        // Warning when 2 minutes left
        if (result.remainingMinutes && result.remainingMinutes <= 2 && result.remainingMinutes > 1) {
          toast.warning(`CM session expires in ${result.remainingMinutes} minutes`);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [cmSession, onSessionChange]);

  const handleLoginSuccess = (sessionData: {
    sessionId: string;
    cmName: string;
    cmEmail: string;
    productTag: string;
    expiresIn: number;
  }) => {
    setCMSession({
      sessionId: sessionData.sessionId,
      cmName: sessionData.cmName,
      cmEmail: sessionData.cmEmail,
      productTag: sessionData.productTag,
      remainingMinutes: sessionData.expiresIn
    });
    onSessionChange?.(sessionData.sessionId);
  };

  const handleLogout = async () => {
    if (!cmSession) return;

    setIsLoggingOut(true);
    try {
      const result = await cmLogoutFromAgencySessionAction(cmSession.sessionId);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${cmSession.cmName} logged out successfully`);
        setCMSession(null);
        onSessionChange?.(null);
      }
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (cmSession) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-gray-900">Collection Manager Active</h4>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Logged In
              </Badge>
            </div>
            
            <p className="text-sm text-gray-700 mb-1">{cmSession.cmName}</p>
            <p className="text-xs text-gray-500 truncate">{cmSession.cmEmail}</p>
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Product:</span> {cmSession.productTag}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-3 w-3 text-gray-500" />
              <span className={`text-xs font-medium ${
                cmSession.remainingMinutes <= 2 ? 'text-red-600' : 
                cmSession.remainingMinutes <= 5 ? 'text-amber-600' : 
                'text-gray-600'
              }`}>
                {cmSession.remainingMinutes} min remaining
              </span>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {cmSession.remainingMinutes <= 2 && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800">
              Session expiring soon! Complete your approvals or login again.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowLoginModal(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        size="sm"
      >
        <Shield className="h-4 w-4 mr-2" />
        CM Login
      </Button>

      <CMLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}