
-- Allow unattributed marketing records when the original visitor is not a registered user.
ALTER TABLE "Attribution" ALTER COLUMN "userId" DROP NOT NULL;

-- Restore legacy lower-case attribution rows preserved by prisma/preserve-legacy-attribution.ts.
-- This keeps previously captured campaigns rather than losing them in the older migration.
DO $$
BEGIN
  IF to_regclass('public.attribution_legacy_backup') IS NOT NULL THEN
    INSERT INTO "Attribution" (
      "id", "userId", "telegramId", "phone", "firstTouchSource", "firstTouchCampaign",
      "firstTouchReferrer", "firstSeenAt", "lastSeenAt", "lastIp", "deviceFingerprint", "createdAt", "updatedAt"
    )
    SELECT
      legacy."id",
      COALESCE(u."id", NULL),
      legacy."telegram_id",
      legacy."phone",
      CASE WHEN legacy."first_touch_source" IN ('direct', 'deep_link', 'referral', 'utm', 'qr', 'invite')
        THEN legacy."first_touch_source"::"TouchSource" ELSE 'direct'::"TouchSource" END,
      legacy."first_touch_campaign",
      legacy."first_touch_referrer",
      legacy."first_seen_at",
      legacy."last_seen_at",
      legacy."ip",
      legacy."device_fingerprint",
      legacy."created_at",
      legacy."updated_at"
    FROM public.attribution_legacy_backup AS legacy
    LEFT JOIN "User" AS u ON u."telegramId" = legacy."telegram_id"
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Pre-existing objects were publicly visible before moderation was introduced. Mark only those legacy
-- objects without a moderation record as approved; new objects still start as pending.
INSERT INTO "Moderation" ("id", "objectId", "status", "createdAt", "updatedAt")
SELECT 'legacy_' || md5(o."id"), o."id", 'approved'::"ModerationStatus", NOW(), NOW()
FROM "Object" o
LEFT JOIN "Moderation" m ON m."objectId" = o."id"
WHERE m."objectId" IS NULL
ON CONFLICT ("objectId") DO NOTHING;

-- Shared rate-limit counters allow all backend replicas to enforce the same windows.
CREATE TABLE IF NOT EXISTS "RateLimitCounter" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "RateLimitCounter_resetAt_idx" ON "RateLimitCounter"("resetAt");

-- Attribution rows originally used random UUIDs that did not correspond to User.id.
-- Preserve records while mapping Telegram users to real database user IDs where possible.
UPDATE "Attribution" AS a
SET "userId" = u."id"
FROM "User" AS u
WHERE a."telegramId" = u."telegramId"
  AND (a."userId" IS NULL OR NOT EXISTS (SELECT 1 FROM "User" existing WHERE existing."id" = a."userId"))
  AND NOT EXISTS (
    SELECT 1 FROM "Attribution" other
    WHERE other."userId" = u."id" AND other."id" <> a."id"
  );
UPDATE "Attribution" AS a
SET "userId" = NULL
WHERE a."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = a."userId");

-- Composite indexes for common filters and paged history queries.
CREATE INDEX IF NOT EXISTS "Object_city_type_price_idx" ON "Object"("city", "type", "price");
CREATE INDEX IF NOT EXISTS "Object_city_price_idx" ON "Object"("city", "price");
CREATE INDEX IF NOT EXISTS "Object_type_yieldPercent_idx" ON "Object"("type", "yieldPercent");
CREATE INDEX IF NOT EXISTS "Tenant_isAnchor_name_idx" ON "Tenant"("isAnchor", "name");
CREATE INDEX IF NOT EXISTS "Lead_userId_createdAt_idx" ON "Lead"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_clientId_createdAt_idx" ON "Lead"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");
