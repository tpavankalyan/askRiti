import { auth } from './auth';
import { headers } from 'next/headers';

export type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: 'CANCELED' | 'EXPIRED' | 'GENERAL';
};

// Simplified subscription functions - no payment providers
export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  'use server';

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { hasSubscription: false };
    }

    // No subscriptions - simple auth only
    return { hasSubscription: false };
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return {
      hasSubscription: false,
      error: 'Failed to load subscription details',
      errorType: 'GENERAL',
    };
  }
}

// Simple helper - always returns false (no subscriptions)
export async function isUserSubscribed(): Promise<boolean> {
  return false;
}

// Fast pro user status check - always returns false
export async function isUserProCached(): Promise<boolean> {
  return false;
}

// Helper to check if user has access to a specific product/tier
export async function hasAccessToProduct(productId: string): Promise<boolean> {
  return false;
}

// Helper to get user's current subscription status
export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  return 'none';
}

// Get pro status with source - always returns none
export async function getProStatusWithSource(): Promise<{
  isProUser: boolean;
  source: 'polar' | 'dodo' | 'none';
  expiresAt?: Date;
}> {
  return { isProUser: false, source: 'none' };
}
