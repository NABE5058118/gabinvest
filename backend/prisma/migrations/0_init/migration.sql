-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PlacementType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "PlacementType" AS ENUM ('standard', 'paid', 'exclusive');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ModerationStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PriceIndicator' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "PriceIndicator" AS ENUM ('below_market', 'market', 'above_market');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'DealStage' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "DealStage" AS ENUM ('offer', 'counter_offer', 'deposit', 'verification', 'contract', 'registration', 'closed', 'cancelled');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'DealStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "DealStatus" AS ENUM ('active', 'completed', 'cancelled', 'disputed');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'CommissionStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'reserved', 'released', 'refunded');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'AuditEventType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "AuditEventType" AS ENUM ('user_registered', 'user_verified', 'deal_created', 'deal_stage_changed', 'offer_sent', 'counter_offer_sent', 'deposit_paid', 'contract_signed', 'registration_completed', 'deal_closed', 'payment_received', 'commission_reserved', 'commission_released', 'contact_disclosed', 'chat_message_sent', 'anti_bypass_violation', 'deal_alert_created');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'TouchSource' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "TouchSource" AS ENUM ('direct', 'deep_link', 'referral', 'utm', 'qr', 'invite');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'VerificationMethod' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "VerificationMethod" AS ENUM ('telegram', 'sms', 'email');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Object" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "yieldPercent" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT,
    "area" INTEGER NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "monthlyRent" INTEGER,
    "annualRevenue" INTEGER,
    "leaseEndDate" TIMESTAMP(3),
    "anchorTenantName" TEXT,
    "priceIndicator" "PriceIndicator",
    "offerFileUrl" TEXT,
    "offerFileName" TEXT,
    "offerFileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Object_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ObjectImage" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAnchor" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "objectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lease" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" INTEGER NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT true,
    "percentOfTurnover" DOUBLE PRECISION,
    "indexationPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "compensatedByTenant" BOOLEAN NOT NULL DEFAULT false,
    "ownerOnly" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegalConstraint" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EngineeringSpec" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "electricityKw" INTEGER,
    "waterParams" TEXT,
    "gasParams" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineeringSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VatRate" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Moderation" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moderation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Placement" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "type" "PlacementType" NOT NULL DEFAULT 'standard',
    "price" INTEGER,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommercialOffer" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT,
    "telegramPhotoUrl" TEXT,
    "telegramLang" TEXT,
    "telegramPremium" BOOLEAN DEFAULT false,
    "telegramAllowsPm" BOOLEAN DEFAULT false,
    "phone" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" TEXT DEFAULT 'user',
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "telegramId" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "objectId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Attribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "telegramId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "firstTouchSource" "TouchSource" NOT NULL DEFAULT 'direct',
    "firstTouchCampaign" TEXT,
    "firstTouchReferrer" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIp" TEXT,
    "deviceFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Deal" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "agentId" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "stage" "DealStage" NOT NULL DEFAULT 'offer',
    "status" "DealStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DealStageLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Commission" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL DEFAULT 20,
    "status" "CommissionStatus" NOT NULL DEFAULT 'pending',
    "reservedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releasedTo" TEXT,
    "paymentMethod" TEXT,
    "providerRef" TEXT,
    "bankStatementUrl" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "userId" TEXT,
    "dealId" TEXT,
    "objectId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Chat" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "participant1" TEXT NOT NULL,
    "participant2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "filtered" BOOLEAN NOT NULL DEFAULT false,
    "filterReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PhoneVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AntiBypassRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AntiBypassRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payout" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "toUserId" TEXT,
    "toAccount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_city_idx" ON "Object"("city");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_type_idx" ON "Object"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_price_idx" ON "Object"("price");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_area_idx" ON "Object"("area");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_yieldPercent_idx" ON "Object"("yieldPercent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_leaseEndDate_idx" ON "Object"("leaseEndDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_createdAt_idx" ON "Object"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_city_type_price_idx" ON "Object"("city", "type", "price");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_city_price_idx" ON "Object"("city", "price");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Object_type_yieldPercent_idx" ON "Object"("type", "yieldPercent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObjectImage_objectId_idx" ON "ObjectImage"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tenant_objectId_idx" ON "Tenant"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tenant_isAnchor_name_idx" ON "Tenant"("isAnchor", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lease_objectId_idx" ON "Lease"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lease_endDate_idx" ON "Lease"("endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_objectId_idx" ON "Expense"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegalConstraint_objectId_idx" ON "LegalConstraint"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EngineeringSpec_objectId_key" ON "EngineeringSpec"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VatRate_objectId_key" ON "VatRate"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Moderation_objectId_key" ON "Moderation"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Moderation_status_idx" ON "Moderation"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Placement_objectId_key" ON "Placement"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialOffer_objectId_key" ON "CommercialOffer"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_userId_idx" ON "Lead"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_clientId_idx" ON "Lead"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_objectId_idx" ON "Lead"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_userId_createdAt_idx" ON "Lead"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_clientId_createdAt_idx" ON "Lead"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_objectId_key" ON "Favorite"("userId", "objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consent_leadId_idx" ON "Consent"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consent_consentType_idx" ON "Consent"("consentType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consent_acceptedAt_idx" ON "Consent"("acceptedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_objectId_idx" ON "Payment"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_dealId_idx" ON "Payment"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Attribution_userId_key" ON "Attribution"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Attribution_telegramId_key" ON "Attribution"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Attribution_phone_key" ON "Attribution"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attribution_firstTouchSource_idx" ON "Attribution"("firstTouchSource");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attribution_firstSeenAt_idx" ON "Attribution"("firstSeenAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attribution_phone_idx" ON "Attribution"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attribution_telegramId_idx" ON "Attribution"("telegramId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_buyerId_idx" ON "Deal"("buyerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_sellerId_idx" ON "Deal"("sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_objectId_idx" ON "Deal"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_createdAt_idx" ON "Deal"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealStageLog_dealId_idx" ON "DealStageLog"("dealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealStageLog_createdAt_idx" ON "DealStageLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Commission_dealId_idx" ON "Commission"("dealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Commission_createdAt_idx" ON "Commission"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_userId_idx" ON "AuditEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_dealId_idx" ON "AuditEvent"("dealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_objectId_idx" ON "AuditEvent"("objectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Chat_dealId_idx" ON "Chat"("dealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Chat_participant1_idx" ON "Chat"("participant1");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatMessage_chatId_idx" ON "ChatMessage"("chatId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneVerification_phone_idx" ON "PhoneVerification"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneVerification_verified_idx" ON "PhoneVerification"("verified");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Referral_refereeId_idx" ON "Referral"("refereeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referrerId_refereeId_key" ON "Referral"("referrerId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProvider_name_key" ON "PaymentProvider"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payout_commissionId_idx" ON "Payout"("commissionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ObjectImage_objectId_fkey'
      AND conrelid = '"ObjectImage"'::regclass
  ) THEN
    ALTER TABLE "ObjectImage" ADD CONSTRAINT "ObjectImage_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Tenant_objectId_fkey'
      AND conrelid = '"Tenant"'::regclass
  ) THEN
    ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Lease_objectId_fkey'
      AND conrelid = '"Lease"'::regclass
  ) THEN
    ALTER TABLE "Lease" ADD CONSTRAINT "Lease_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Lease_tenantId_fkey'
      AND conrelid = '"Lease"'::regclass
  ) THEN
    ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Expense_objectId_fkey'
      AND conrelid = '"Expense"'::regclass
  ) THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LegalConstraint_objectId_fkey'
      AND conrelid = '"LegalConstraint"'::regclass
  ) THEN
    ALTER TABLE "LegalConstraint" ADD CONSTRAINT "LegalConstraint_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EngineeringSpec_objectId_fkey'
      AND conrelid = '"EngineeringSpec"'::regclass
  ) THEN
    ALTER TABLE "EngineeringSpec" ADD CONSTRAINT "EngineeringSpec_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VatRate_objectId_fkey'
      AND conrelid = '"VatRate"'::regclass
  ) THEN
    ALTER TABLE "VatRate" ADD CONSTRAINT "VatRate_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Moderation_objectId_fkey'
      AND conrelid = '"Moderation"'::regclass
  ) THEN
    ALTER TABLE "Moderation" ADD CONSTRAINT "Moderation_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Placement_objectId_fkey'
      AND conrelid = '"Placement"'::regclass
  ) THEN
    ALTER TABLE "Placement" ADD CONSTRAINT "Placement_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CommercialOffer_objectId_fkey'
      AND conrelid = '"CommercialOffer"'::regclass
  ) THEN
    ALTER TABLE "CommercialOffer" ADD CONSTRAINT "CommercialOffer_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Lead_userId_fkey'
      AND conrelid = '"Lead"'::regclass
  ) THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Lead_objectId_fkey'
      AND conrelid = '"Lead"'::regclass
  ) THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Favorite_objectId_fkey'
      AND conrelid = '"Favorite"'::regclass
  ) THEN
    ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Favorite_userId_fkey'
      AND conrelid = '"Favorite"'::regclass
  ) THEN
    ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Consent_userId_fkey'
      AND conrelid = '"Consent"'::regclass
  ) THEN
    ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Consent_leadId_fkey'
      AND conrelid = '"Consent"'::regclass
  ) THEN
    ALTER TABLE "Consent" ADD CONSTRAINT "Consent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Payment_dealId_fkey'
      AND conrelid = '"Payment"'::regclass
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Deal_buyerId_fkey'
      AND conrelid = '"Deal"'::regclass
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Deal_sellerId_fkey'
      AND conrelid = '"Deal"'::regclass
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Deal_agentId_fkey'
      AND conrelid = '"Deal"'::regclass
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Deal_objectId_fkey'
      AND conrelid = '"Deal"'::regclass
  ) THEN
    ALTER TABLE "Deal" ADD CONSTRAINT "Deal_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DealStageLog_dealId_fkey'
      AND conrelid = '"DealStageLog"'::regclass
  ) THEN
    ALTER TABLE "DealStageLog" ADD CONSTRAINT "DealStageLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Commission_dealId_fkey'
      AND conrelid = '"Commission"'::regclass
  ) THEN
    ALTER TABLE "Commission" ADD CONSTRAINT "Commission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AuditEvent_userId_fkey'
      AND conrelid = '"AuditEvent"'::regclass
  ) THEN
    ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AuditEvent_dealId_fkey'
      AND conrelid = '"AuditEvent"'::regclass
  ) THEN
    ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Chat_dealId_fkey'
      AND conrelid = '"Chat"'::regclass
  ) THEN
    ALTER TABLE "Chat" ADD CONSTRAINT "Chat_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ChatMessage_chatId_fkey'
      AND conrelid = '"ChatMessage"'::regclass
  ) THEN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PhoneVerification_userId_fkey'
      AND conrelid = '"PhoneVerification"'::regclass
  ) THEN
    ALTER TABLE "PhoneVerification" ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Referral_referrerId_fkey'
      AND conrelid = '"Referral"'::regclass
  ) THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Referral_refereeId_fkey'
      AND conrelid = '"Referral"'::regclass
  ) THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Payout_commissionId_fkey'
      AND conrelid = '"Payout"'::regclass
  ) THEN
    ALTER TABLE "Payout" ADD CONSTRAINT "Payout_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

