import { drizzle } from 'drizzle-orm/postgres-js';
import { withReplicas } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';
import { upstashCache } from 'drizzle-orm/cache/upstash';

// Validate DATABASE_URL format
const databaseUrl = serverEnv.DATABASE_URL;
if (!databaseUrl.includes('supabase') && !databaseUrl.includes('postgresql://')) {
  console.warn('⚠️ Warning: DATABASE_URL does not appear to be a Supabase connection string.');
  console.warn('   Expected format: postgresql://user:password@host.supabase.co:5432/postgres');
}

// Configure postgres connection with connection pooling and better error handling
// Supabase uses standard Postgres, so we use postgres-js which is more reliable
// For Supabase, use connection pooling URL if available (recommended for serverless)
const connectionOptions: Parameters<typeof postgres>[1] = {
  max: 5, // Reduced pool size for better reliability
  idle_timeout: 10, // Close idle connections faster
  connect_timeout: 10, // Reduced timeout - fail fast if connection is bad
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  transform: {
    undefined: null, // Transform undefined to null for Postgres compatibility
  },
  // Supabase requires SSL
  ssl: databaseUrl.includes('supabase') ? ('require' as const) : undefined,
  // Better error handling
  onnotice: () => {}, // Suppress notices
  connection: {
    application_name: 'askRiti',
  },
};

// Create main database connection with error handling
const sql = postgres(databaseUrl, connectionOptions);

// Test connection asynchronously (non-blocking)
setTimeout(async () => {
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connection established successfully');
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('   Please verify your DATABASE_URL is correct and accessible');
    console.error('   Expected format: postgresql://user:password@host.supabase.co:5432/postgres?sslmode=require');
  }
}, 1000);

// Read replicas are optional - only use if configured
const sqlread1 = process.env.READ_DB_1 
  ? postgres(process.env.READ_DB_1, connectionOptions) 
  : null;
const sqlread2 = process.env.READ_DB_2 
  ? postgres(process.env.READ_DB_2, connectionOptions) 
  : null;

// Cleanup function to close connections gracefully
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await sql.end();
    if (sqlread1) await sqlread1.end();
    if (sqlread2) await sqlread2.end();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await sql.end();
    if (sqlread1) await sqlread1.end();
    if (sqlread2) await sqlread2.end();
    process.exit(0);
  });
}

// Helper function to validate Upstash URL
function isValidUpstashUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    // Check if it's a valid Upstash URL format (should be https://*.upstash.io)
    // Also check for known invalid/deleted instances
    if (url.includes('fond-insect-21280.upstash.io')) {
      console.warn('⚠️ Invalid Upstash URL detected (deleted instance), disabling cache');
      return false;
    }
    return urlObj.protocol === 'https:' && urlObj.hostname.endsWith('.upstash.io');
  } catch {
    return false;
  }
}

// Only use Upstash cache if credentials are provided and URL is valid
const cacheConfig = 
  serverEnv.UPSTASH_REDIS_REST_URL && 
  serverEnv.UPSTASH_REDIS_REST_TOKEN &&
  isValidUpstashUrl(serverEnv.UPSTASH_REDIS_REST_URL)
  ? (() => {
      try {
        return upstashCache({
          url: serverEnv.UPSTASH_REDIS_REST_URL!,
          token: serverEnv.UPSTASH_REDIS_REST_TOKEN!,
          global: true,
          config: { ex: 600 },
        });
      } catch (error) {
        console.warn('⚠️ Failed to initialize Upstash cache, continuing without cache:', error);
        return undefined;
      }
    })()
  : undefined;

export const maindb = drizzle(sql, {
  schema,
  ...(cacheConfig && { cache: cacheConfig }),
});

// Only create replica databases if they're configured
const replica1 = sqlread1
  ? drizzle(sqlread1, {
      schema,
      ...(cacheConfig && { cache: cacheConfig }),
    })
  : null;
const replica2 = sqlread2
  ? drizzle(sqlread2, {
      schema,
      ...(cacheConfig && { cache: cacheConfig }),
    })
  : null;

// Use replicas if available, otherwise just use main database
export const db = replica1 && replica2
  ? withReplicas(maindb, [replica1, replica2])
  : replica1
  ? withReplicas(maindb, [replica1])
  : maindb;
