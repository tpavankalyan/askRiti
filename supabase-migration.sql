-- Combined migration file for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Migration 0000: Initial schema
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL
);

CREATE TABLE IF NOT EXISTS "message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "stream" (
	"id" text PRIMARY KEY NOT NULL,
	"chatId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);

-- Foreign keys
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "stream" ADD CONSTRAINT "stream_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Migration 0004: Subscription table
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp NOT NULL,
	"modifiedAt" timestamp,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"recurringInterval" text NOT NULL,
	"status" text NOT NULL,
	"currentPeriodStart" timestamp NOT NULL,
	"currentPeriodEnd" timestamp NOT NULL,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"canceledAt" timestamp,
	"startedAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"endedAt" timestamp,
	"customerId" text NOT NULL,
	"productId" text NOT NULL,
	"discountId" text,
	"checkoutId" text NOT NULL,
	"customerCancellationReason" text,
	"customerCancellationComment" text,
	"metadata" text,
	"customFieldData" text,
	"userId" text
);

DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Migration 0005: Extreme search usage
CREATE TABLE IF NOT EXISTS "extreme_search_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"search_count" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "extreme_search_usage" ADD CONSTRAINT "extreme_search_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Migration 0006: Message usage
CREATE TABLE IF NOT EXISTS "message_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "message_usage" ADD CONSTRAINT "message_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Migration 0007: Custom instructions
CREATE TABLE IF NOT EXISTS "custom_instructions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "custom_instructions" ADD CONSTRAINT "custom_instructions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Migration 0008: Lookout and Payment tables, message columns
CREATE TABLE IF NOT EXISTS "lookout" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"frequency" text NOT NULL,
	"cron_schedule" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"qstash_schedule_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_run_at" timestamp,
	"last_run_chat_id" text,
	"run_history" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"brand_id" text,
	"business_id" text,
	"card_issuing_country" text,
	"card_last_four" text,
	"card_network" text,
	"card_type" text,
	"currency" text NOT NULL,
	"digital_products_delivered" boolean DEFAULT false,
	"discount_id" text,
	"error_code" text,
	"error_message" text,
	"payment_link" text,
	"payment_method" text,
	"payment_method_type" text,
	"settlement_amount" integer,
	"settlement_currency" text,
	"settlement_tax" integer,
	"status" text,
	"subscription_id" text,
	"tax" integer,
	"total_amount" integer NOT NULL,
	"billing" json,
	"customer" json,
	"disputes" json,
	"metadata" json,
	"product_cart" json,
	"refunds" json,
	"user_id" text
);

-- Add columns to message table if they don't exist
DO $$ BEGIN
 ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "model" text;
 ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "input_tokens" integer;
 ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "output_tokens" integer;
 ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "total_tokens" integer;
 ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "completion_time" real;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "lookout" ADD CONSTRAINT "lookout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

