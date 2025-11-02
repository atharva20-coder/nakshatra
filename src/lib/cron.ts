// ============================================
// FILE 1: src/lib/cron.ts
// ============================================
import cron from 'node-cron';
import { markOverdueFormsAction } from '@/actions/monthly-refresh.action';

let isInitialized = false;

/**
 * Initialize all cron jobs
 * Call this once in your application startup
 */
export function initializeCronJobs() {
  if (isInitialized) {
    console.log('⏰ Cron jobs already initialized');
    return;
  }

  console.log('🚀 Initializing cron jobs...');

  // Schedule 1: Mark overdue forms daily at 1:00 AM IST
  // Cron format: minute hour day month weekday
  // '0 1 * * *' = At 01:00 AM every day
  cron.schedule('0 1 * * *', async () => {
    console.log('⏰ [CRON] Running daily overdue check at:', new Date().toISOString());
    
    try {
      const result = await markOverdueFormsAction();
      
      if (result.error) {
        console.error('❌ [CRON] Failed to mark overdue forms:', result.error);
      } else {
        console.log(`✅ [CRON] Successfully marked ${result.totalOverdue} forms as overdue`);
        if (result.overdueDetails && result.overdueDetails.length > 0) {
          console.log('📋 [CRON] Overdue details:', result.overdueDetails);
        }
      }
    } catch (error) {
      console.error('❌ [CRON] Error in overdue check:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // IST timezone
  });

  // Optional: Schedule form refresh check on 5th of every month at 2:00 AM
  cron.schedule('0 2 5 * *', async () => {
    console.log('⏰ [CRON] Running monthly form refresh check at:', new Date().toISOString());
    
    // Add any additional monthly maintenance tasks here
    console.log('✅ [CRON] Monthly refresh check completed');
  }, {
    timezone: "Asia/Kolkata"
  });

  isInitialized = true;
  console.log('✅ Cron jobs initialized successfully');
  console.log('📅 Scheduled jobs:');
  console.log('   - Overdue check: Daily at 1:00 AM IST');
  console.log('   - Monthly refresh: 5th of every month at 2:00 AM IST');
}

/**
 * Stop all cron jobs (useful for graceful shutdown)
 */
export function stopCronJobs() {
  cron.getTasks().forEach(task => task.stop());
  isInitialized = false;
  console.log('🛑 All cron jobs stopped');
}