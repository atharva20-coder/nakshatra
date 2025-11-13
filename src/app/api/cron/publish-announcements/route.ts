// src/app/api/cron/publish-announcements/route.ts
import { publishDueAnnouncementsAction } from "@/actions/scheduled-announcement.action";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  // Optional: Add authentication with a secret token
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await publishDueAnnouncementsAction();
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      published: result.data.published,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('CRON job error:', error);
    return NextResponse.json({ 
      error: 'Failed to publish announcements' 
    }, { status: 500 });
  }
}

// Allow POST as well for manual triggering
export async function POST(request: Request) {
  return GET(request);
}