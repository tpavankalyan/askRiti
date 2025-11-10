# Environment Variables Setup

After disabling dodo payments, you need to set up the following environment variables for Polar subscriptions to work:

## Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/scira"

# Authentication
BETTER_AUTH_SECRET="your-better-auth-secret-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Redis
REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_REST_URL="your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"

# AI Providers
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Polar Subscriptions (Required for Pro features)
POLAR_ACCESS_TOKEN="your-polar-access-token"
POLAR_WEBHOOK_SECRET="your-polar-webhook-secret"
NEXT_PUBLIC_STARTER_TIER="your-starter-product-id"
NEXT_PUBLIC_STARTER_SLUG="your-starter-product-slug"

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

## Polar Setup

1. Go to [Polar.sh](https://polar.sh) and create an account
2. Create a new organization
3. Create a product for your Pro subscription
4. Get your access token from the Polar dashboard
5. Set up webhooks pointing to your domain
6. Copy the product ID and slug to your environment variables

## Temporary Fallbacks

The app will now run with fallback values if these environment variables are not set, but Polar subscriptions won't work properly until you configure them.

## Next Steps

1. Set up your Polar account and get the required credentials
2. Add them to your `.env.local` file
3. Restart your development server
4. Test the subscription flow

done
