import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Create a new ratelimiter that allows 3 requests per day for unauthenticated users
// In development, use a more lenient limit for testing
export const unauthenticatedRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: isDevelopment 
    ? Ratelimit.slidingWindow(50, '1 h') // 50 requests per hour in development
    : Ratelimit.slidingWindow(3, '1 d'), // 3 requests per 1 day in production
  analytics: true,
  prefix: '@upstash/ratelimit:unauth',
});

// Helper function to get IP address from request
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] ?? realIp ?? 'unknown';
  return `ip:${ip}`;
}

// Development utility to reset rate limits
export async function resetRateLimits(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Rate limit reset is not allowed in production');
  }
  
  try {
    const redis = Redis.fromEnv();
    const pattern = '@upstash/ratelimit:unauth:*';
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} rate limit entries`);
    }
  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
    throw error;
  }
}

