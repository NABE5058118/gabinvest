-- Migration: deal_commission
-- Creates tables for deal funnel, attribution, commissions, audit events, chat, phone verification, referrals

CREATE TABLE IF NOT EXISTS "attribution" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_touch_source" TEXT NOT NULL DEFAULT 'direct',
    "first_touch_campaign" TEXT,
    "first_touch_referrer" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "telegram_id" TEXT,
    "phone" TEXT,
    "ip" TEXT,
    "device_fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attribution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attribution_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "attribution_telegram_id_key" UNIQUE ("telegram_id"),
    CONSTRAINT "attribution_phone_key" UNIQUE ("phone")
);

CREATE INDEX IF NOT EXISTS "attribution_first_seen_at_idx" ON "attribution" ("first_seen_at");
CREATE INDEX IF NOT EXISTS "attribution_first_touch_source_idx" ON "attribution" ("first_touch_source");