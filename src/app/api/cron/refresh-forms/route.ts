// src/app/api/cron/refresh-forms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { refreshEligibleAgencyFormsAction } from '@/actions/monthly-refresh.action';

/**
 * API Route for automatic form refresh on 5th of each month
 * Creates new form cycles only for agencies with no overdue forms
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Invalid cron authorization');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    console.log(`⏰ [CRON REFRESH] Starting at ${now.toISOString()}`);
    
    const result = await refreshEligibleAgencyFormsAction();

    if (result.error) {
      console.error('❌ [CRON REFRESH] Error:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ [CRON REFRESH] Complete`);
    console.log(`   Refreshed: ${result.refreshedAgencies} agencies`);
    console.log(`   Skipped: ${result.skippedAgencies} agencies`);
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [CRON REFRESH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Form Refresh Cron',
    schedule: 'Runs on 5th of each month at 1:00 AM IST',
    note: 'Use POST with Bearer token to trigger'
  });
}