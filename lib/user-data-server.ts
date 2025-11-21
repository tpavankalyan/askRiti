import 'server-only';

import { eq } from 'drizzle-orm';
import { user } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import { getCustomInstructionsByUserId } from './db/queries';
import type { CustomInstructions } from './db/schema';

// Simplified user data type - no subscriptions
export type ComprehensiveUserData = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  isProUser: boolean; // Always false - no subscriptions
  proSource: 'polar' | 'dodo' | 'none'; // Always 'none'
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'none'; // Always 'none'
};

// Lightweight user auth type for fast checks
export type LightweightUserAuth = {
  userId: string;
  email: string;
  isProUser: boolean; // Always false
};

const userDataCache = new Map<string, { data: ComprehensiveUserData; expiresAt: number }>();
const lightweightAuthCache = new Map<string, { data: LightweightUserAuth; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LIGHTWEIGHT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Custom instructions cache (per-user)
const customInstructionsCache = new Map<
  string,
  {
    instructions: CustomInstructions | null;
    timestamp: number;
    ttl: number;
  }
>();
const CUSTOM_INSTRUCTIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserData(userId: string): ComprehensiveUserData | null {
  const cached = userDataCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    userDataCache.delete(userId);
  }
  return null;
}

function setCachedUserData(userId: string, data: ComprehensiveUserData): void {
  userDataCache.set(userId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearUserDataCache(userId: string): void {
  userDataCache.delete(userId);
  lightweightAuthCache.delete(userId);
  customInstructionsCache.delete(userId);
}

export function clearAllUserDataCache(): void {
  userDataCache.clear();
  lightweightAuthCache.clear();
  customInstructionsCache.clear();
}

function getCachedLightweightAuth(userId: string): LightweightUserAuth | null {
  const cached = lightweightAuthCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    lightweightAuthCache.delete(userId);
  }
  return null;
}

function setCachedLightweightAuth(userId: string, data: LightweightUserAuth): void {
  lightweightAuthCache.set(userId, {
    data,
    expiresAt: Date.now() + LIGHTWEIGHT_CACHE_TTL_MS,
  });
}

/**
 * Get custom instructions for a user with in-memory caching.
 */
export async function getCachedCustomInstructionsByUserId(
  userId: string,
  options?: { ttlMs?: number },
): Promise<CustomInstructions | null> {
  const ttlMs = options?.ttlMs ?? CUSTOM_INSTRUCTIONS_CACHE_TTL_MS;
  const cached = customInstructionsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.instructions;
  }

  const instructions = await getCustomInstructionsByUserId({ userId });
  customInstructionsCache.set(userId, {
    instructions: instructions ?? null,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
  return instructions ?? null;
}

export function clearCustomInstructionsCache(userId?: string): void {
  if (userId) {
    customInstructionsCache.delete(userId);
  } else {
    customInstructionsCache.clear();
  }
}

/**
 * Lightweight authentication check - simplified, no subscription checks
 */
export async function getLightweightUserAuth(): Promise<LightweightUserAuth | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Check lightweight cache first
    const cached = getCachedLightweightAuth(userId);
    if (cached) {
      return cached;
    }

    // Check if full user data is cached
    const fullCached = getCachedUserData(userId);
    if (fullCached) {
      const lightweightData: LightweightUserAuth = {
        userId: fullCached.id,
        email: fullCached.email,
        isProUser: false, // No subscriptions
      };
      setCachedLightweightAuth(userId, lightweightData);
      return lightweightData;
    }

    // Simple user query - no subscription joins
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        id: true,
        email: true,
      },
    });

    if (!userData) {
      return null;
    }

    const lightweightData: LightweightUserAuth = {
      userId: userData.id,
      email: userData.email,
      isProUser: false, // No subscriptions
    };

    // Cache the result
    setCachedLightweightAuth(userId, lightweightData);

    return lightweightData;
  } catch (error) {
    console.error('Error in lightweight auth check:', error);
    return null;
  }
}

export async function getComprehensiveUserData(): Promise<ComprehensiveUserData | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Check cache first
    const cached = getCachedUserData(userId);
    if (cached) {
      return cached;
    }

    // Simple user query - no subscription logic
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!userData) {
      return null;
    }

    // Build simplified user data - no subscriptions
    const comprehensiveData: ComprehensiveUserData = {
      id: userData.id,
      email: userData.email,
      emailVerified: userData.emailVerified,
      name: userData.name || userData.email.split('@')[0],
      image: userData.image,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      isProUser: false, // No subscriptions
      proSource: 'none',
      subscriptionStatus: 'none',
    };

    // Cache the result
    setCachedUserData(userId, comprehensiveData);

    return comprehensiveData;
  } catch (error) {
    console.error('Error getting comprehensive user data:', error);
    return null;
  }
}

// Helper functions for backward compatibility
export async function isUserPro(): Promise<boolean> {
  return false; // No subscriptions
}

export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  return 'none';
}

export async function getProSource(): Promise<'polar' | 'dodo' | 'none'> {
  return 'none';
}
