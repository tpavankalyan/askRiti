import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import {
  user,
  session,
  verification,
  account,
  chat,
  message,
  extremeSearchUsage,
  messageUsage,
  subscription,
  payment,
  customInstructions,
  stream,
  lookout,
} from '@/lib/db/schema';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import { config } from 'dotenv';
import { serverEnv } from '@/env/server';

config({
  path: '.env.local',
});

export const auth = betterAuth({
  rateLimit: {
    max: 50,
    window: 60,
  },
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      verification,
      account,
      chat,
      message,
      extremeSearchUsage,
      messageUsage,
      subscription,
      payment,
      customInstructions,
      stream,
      lookout,
    },
  }),
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },
    twitter: {
      clientId: serverEnv.TWITTER_CLIENT_ID,
      clientSecret: serverEnv.TWITTER_CLIENT_SECRET,
    },
    microsoft: {
      clientId: serverEnv.MICROSOFT_CLIENT_ID,
      clientSecret: serverEnv.MICROSOFT_CLIENT_SECRET,
      prompt: 'select_account', // Forces account selection
    },
  },
  pluginRoutes: {
    autoNamespace: true,
  },
  plugins: [nextCookies()],
  trustedOrigins: ['http://localhost:3000', 'https://ask.ritivel.com'],
  allowedOrigins: ['http://localhost:3000', 'https://ask.ritivel.com'],
});
