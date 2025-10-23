import { NextRequest, NextResponse } from 'next/server';
import { resetRateLimits } from '@/lib/rate-limit';

/**
 * Development-only endpoint to reset rate limits
 * Only works in development mode
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Rate limit reset is not allowed in production' },
      { status: 403 }
    );
  }

  try {
    await resetRateLimits();
    return NextResponse.json({ 
      success: true, 
      message: 'Rate limits reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting rate limits:', error);
    return NextResponse.json(
      { error: 'Failed to reset rate limits' },
      { status: 500 }
    );
  }
}
