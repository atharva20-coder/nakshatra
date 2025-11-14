// ============================================
// FILE 2: src/app/api/cron/mark-overdue/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { markOverdueFormsAction } from '@/actions/monthly-refresh.action';

/**
 * API Route for manual cron trigger
 * Can be called by external cron services (Vercel Cron, etc.)
 * 
 * Requires CRON_SECRET in environment variables
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security
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
    console.log('⏰ [API CRON] Starting overdue check...');
    const result = await markOverdueFormsAction();

    if (result.error) {
      console.error('❌ [API CRON] Error:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ [API CRON] Marked ${result.totalOverdue} forms as overdue`);
    return NextResponse.json({
      success: true,
      totalOverdue: result.totalOverdue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [API CRON] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET for testing (remove in production)
export async function GET() {
  return NextResponse.json({
    message: 'Cron endpoint is active',
    note: 'Use POST with Bearer token to trigger'
  });
}