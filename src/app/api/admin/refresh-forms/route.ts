// ============================================
// FILE 3: src/app/api/admin/refresh-forms/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { refreshUserFormsAction } from '@/actions/admin-refresh.action';

/**
 * Admin API to manually refresh forms for a user
 */
export async function POST(request: NextRequest) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Check admin authorization
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await refreshUserFormsAction(userId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in admin refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}