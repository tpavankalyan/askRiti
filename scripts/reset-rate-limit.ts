#!/usr/bin/env tsx

/**
 * Development utility to reset rate limits
 * Usage: npx tsx scripts/reset-rate-limit.ts
 */

import { Redis } from '@upstash/redis';

async function resetRateLimits() {
  try {
    const redis = Redis.fromEnv();
    
    // Clear all rate limit keys for unauthenticated users
    const pattern = '@upstash/ratelimit:unauth:*';
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} rate limit entries`);
    } else {
      console.log('ℹ️  No rate limit entries found to clear');
    }
    
    // Also clear any other rate limit patterns if they exist
    const allPatterns = [
      '@upstash/ratelimit:*',
      'ritivel-ai:*',
    ];
    
    for (const pattern of allPatterns) {
      const patternKeys = await redis.keys(pattern);
      if (patternKeys.length > 0) {
        await redis.del(...patternKeys);
        console.log(`✅ Cleared ${patternKeys.length} entries for pattern: ${pattern}`);
      }
    }
    
    console.log('🎉 Rate limits reset successfully!');
    
  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
    process.exit(1);
  }
}

// Run the reset function
resetRateLimits();
