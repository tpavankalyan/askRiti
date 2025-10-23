// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    // Core AI APIs - keep OpenAI required, others optional for development
    XAI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    
    // Development & Sandbox
    DAYTONA_API_KEY: z.string().optional().default('dev-key'),
    
    // Essential infrastructure - keep these required
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    REDIS_URL: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    
    // Authentication - make optional for development
    GITHUB_CLIENT_ID: z.string().optional().default('dev-github-id'),
    GITHUB_CLIENT_SECRET: z.string().optional().default('dev-github-secret'),
    GOOGLE_CLIENT_ID: z.string().optional().default('dev-google-id'),
    GOOGLE_CLIENT_SECRET: z.string().optional().default('dev-google-secret'),
    TWITTER_CLIENT_ID: z.string().optional().default('dev-twitter-id'),
    TWITTER_CLIENT_SECRET: z.string().optional().default('dev-twitter-secret'),
    
    // External APIs - make optional for development
    ELEVENLABS_API_KEY: z.string().optional().default('dev-elevenlabs-key'),
    TAVILY_API_KEY: z.string().optional().default('dev-tavily-key'),
    EXA_API_KEY: z.string().optional().default('dev-exa-key'),
    VALYU_API_KEY: z.string().optional().default('dev-valyu-key'),
    TMDB_API_KEY: z.string().optional().default('dev-tmdb-key'),
    YT_ENDPOINT: z.string().optional().default('dev-yt-endpoint'),
    FIRECRAWL_API_KEY: z.string().optional().default('dev-firecrawl-key'),
    PARALLEL_API_KEY: z.string().optional().default('dev-parallel-key'),
    OPENWEATHER_API_KEY: z.string().optional().default('dev-openweather-key'),
    GOOGLE_MAPS_API_KEY: z.string().optional().default('dev-google-maps-key'),
    AMADEUS_API_KEY: z.string().optional().default('dev-amadeus-key'),
    AMADEUS_API_SECRET: z.string().optional().default('dev-amadeus-secret'),
    CRON_SECRET: z.string().optional().default('dev-cron-secret'),
    BLOB_READ_WRITE_TOKEN: z.string().optional().default('dev-blob-token'),
    SMITHERY_API_KEY: z.string().optional().default('dev-smithery-key'),
    COINGECKO_API_KEY: z.string().optional().default('dev-coingecko-key'),
    QSTASH_TOKEN: z.string().optional().default('dev-qstash-token'),
    RESEND_API_KEY: z.string().optional().default('dev-resend-key'),
    SUPERMEMORY_API_KEY: z.string().optional().default('dev-supermemory-key'),
    FASTAPI_URL: z.string().optional().default('https://pyretrieval.vercel.app'),
    
    // Payment providers - make optional for development
    DODO_PAYMENTS_API_KEY: z.string().optional().default('dev-dodo-payments-key'),
    DODO_PAYMENTS_WEBHOOK_SECRET: z.string().optional().default('dev-dodo-webhook-secret'),
    POLAR_ACCESS_TOKEN: z.string().optional().default('dev-polar-token'),
    POLAR_WEBHOOK_SECRET: z.string().optional().default('dev-polar-webhook-secret'),
    
    // Microsoft OAuth
    MICROSOFT_CLIENT_ID: z.string().optional().default('dev-microsoft-id'),
    MICROSOFT_CLIENT_SECRET: z.string().optional().default('dev-microsoft-secret'),
    
    ALLOWED_ORIGINS: z.string().optional().default('https://pyretrieval.vercel.app/'),
  },
  experimental__runtimeEnv: process.env,
});
