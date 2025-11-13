// ============================================
// FILE: src/lib/cron.ts
// ============================================
import cron from "node-cron";
import { markOverdueFormsAction } from "@/actions/monthly-refresh.action";
import { publishDueAnnouncementsAction } from "@/actions/scheduled-announcement.action";

let isInitialized = false;

/**
 * Initialize all cron jobs
 * Call this ONCE in your application startup (e.g., layout.tsx)
 */
export function initializeCronJobs() {
  if (isInitialized) {
    console.log("⏰ Cron jobs already initialized");
    return;
  }

  console.log("🚀 Initializing cron jobs...");

  // 1️⃣ Daily overdue forms check — runs every day at 1:00 AM IST
  cron.schedule(
    "0 1 * * *",
    async () => {
      console.log("⏰ [CRON] Running daily overdue check at:", new Date().toISOString());
      try {
        const result = await markOverdueFormsAction();

        if (result.error) {
          console.error("❌ [CRON] Failed to mark overdue forms:", result.error);
        } else {
          console.log(`✅ [CRON] Marked ${result.totalOverdue} forms as overdue`);
          if (result.overdueDetails?.length) {
            console.log("📋 [CRON] Overdue details:", result.overdueDetails);
          }
        }
      } catch (error) {
        console.error("❌ [CRON] Error in overdue check:", error);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // 2️⃣ Monthly maintenance job — 5th of every month at 2:00 AM IST
  cron.schedule(
    "0 2 5 * *",
    async () => {
      console.log("⏰ [CRON] Running monthly form refresh check at:", new Date().toISOString());
      // Add your custom maintenance logic here
      console.log("✅ [CRON] Monthly refresh check completed");
    },
    { timezone: "Asia/Kolkata" }
  );

  // 3️⃣ Publish due announcements — every 10 minutes
  cron.schedule(
    "*/10 * * * *",
    async () => {
      console.log("📢 [CRON] Checking for due announcements...");
      try {
        const result = await publishDueAnnouncementsAction();
        if (result.success) {
          console.log(`✅ [CRON] Published ${result.data.published} announcements at ${new Date().toISOString()}`);
        } else {
          console.error(`❌ [CRON] Failed: ${result.error}`);
        }
      } catch (error) {
        console.error("❌ [CRON] Unexpected error in announcement publisher:", error);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  isInitialized = true;

  console.log("✅ Cron jobs initialized successfully");
  console.log("📅 Scheduled jobs:");
  console.log("   - Overdue check: Daily at 1:00 AM IST");
  console.log("   - Monthly refresh: 5th of every month at 2:00 AM IST");
  console.log("   - Announcement publisher: Every 10 minutes");
}

/**
 * Stop all cron jobs (useful for graceful shutdown)
 */
export function stopCronJobs() {
  cron.getTasks().forEach((task) => task.stop());
  isInitialized = false;
  console.log("🛑 All cron jobs stopped");
}
