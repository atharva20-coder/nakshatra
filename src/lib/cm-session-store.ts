// src/lib/cm-session-store.ts
// Centralized CM session management with automatic cleanup

export interface CMSessionData {
  cmUserId: string;
  cmName: string;
  cmEmail: string;
  cmDesignation: string;
  productTag: string;
  agencyUserId: string;
  agencyName: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
}

// Session timeout: 15 minutes
export const CM_SESSION_TIMEOUT = 15 * 60 * 1000;

// In-memory session store (use Redis in production)
const cmSessionStore = new Map<string, CMSessionData>();

// Cleanup interval: every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Create a new CM session
 */
export function createCMSession(sessionId: string, data: CMSessionData): void {
  cmSessionStore.set(sessionId, {
    ...data,
    lastActivity: new Date()
  });
}

/**
 * Get CM session by ID
 */
export function getCMSession(sessionId: string): CMSessionData | null {
  const session = cmSessionStore.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session has expired
  const now = Date.now();
  const lastActivityTime = session.lastActivity.getTime();
  
  if (now - lastActivityTime > CM_SESSION_TIMEOUT) {
    // Session expired - remove it
    cmSessionStore.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Update session last activity time
 */
export function updateCMSessionActivity(sessionId: string): boolean {
  const session = cmSessionStore.get(sessionId);
  
  if (!session) {
    return false;
  }

  session.lastActivity = new Date();
  cmSessionStore.set(sessionId, session);
  return true;
}

/**
 * Delete CM session (logout)
 */
export function deleteCMSession(sessionId: string): boolean {
  return cmSessionStore.delete(sessionId);
}

/**
 * Get all sessions for a specific agency
 */
export function getAgencyCMSessions(agencyUserId: string): Array<{ sessionId: string; data: CMSessionData }> {
  const sessions: Array<{ sessionId: string; data: CMSessionData }> = [];
  
  for (const [sessionId, data] of cmSessionStore.entries()) {
    if (data.agencyUserId === agencyUserId) {
      sessions.push({ sessionId, data });
    }
  }
  
  return sessions;
}

/**
 * Get all active sessions (for admin monitoring)
 */
export function getAllActiveCMSessions(): Array<{ sessionId: string; data: CMSessionData }> {
  const sessions: Array<{ sessionId: string; data: CMSessionData }> = [];
  
  for (const [sessionId, data] of cmSessionStore.entries()) {
    sessions.push({ sessionId, data });
  }
  
  return sessions;
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  const expiredSessions: string[] = [];

  for (const [sessionId, data] of cmSessionStore.entries()) {
    const lastActivityTime = data.lastActivity.getTime();
    
    if (now - lastActivityTime > CM_SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  }

  // Remove expired sessions
  for (const sessionId of expiredSessions) {
    cmSessionStore.delete(sessionId);
    console.log(`[CM Session] Cleaned up expired session: ${sessionId}`);
  }

  if (expiredSessions.length > 0) {
    console.log(`[CM Session] Cleaned up ${expiredSessions.length} expired session(s)`);
  }
}

/**
 * Start automatic cleanup of expired sessions
 */
export function startCMSessionCleanup(): void {
  // Run cleanup immediately
  cleanupExpiredSessions();
  
  // Then run periodically
  setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL);
  
  console.log(`[CM Session] Cleanup service started (runs every ${CLEANUP_INTERVAL / 1000}s)`);
}

/**
 * Get session statistics
 */
export function getCMSessionStats(): {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
} {
  const now = Date.now();
  let active = 0;
  let expired = 0;

  for (const [_, data] of cmSessionStore.entries()) {
    const lastActivityTime = data.lastActivity.getTime();
    
    if (now - lastActivityTime > CM_SESSION_TIMEOUT) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    totalSessions: cmSessionStore.size,
    activeSessions: active,
    expiredSessions: expired
  };
}

// Start cleanup service when this module is imported
if (typeof window === 'undefined') { // Only on server
  startCMSessionCleanup();
}