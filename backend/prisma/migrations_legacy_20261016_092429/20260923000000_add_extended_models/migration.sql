-- Remove roi column from Object
ALTER TABLE "Object" DROP COLUMN IF EXISTS "roi";

-- Add new columns to Object
ALTER TABLE "Object" ADD COLUMN IF NOT EXISTS "monthlyRent" INTEGER;
ALTER TABLE "Object" ADD COLUMN IF NOT EXISTS "annualRevenue" INTEGER;
ALTER TABLE "Object" ADD COLUMN IF NOT EXISTS "leaseEndDate" TIMESTAMP(3);
ALTER TABLE "Object" ADD COLUMN IF NOT EXISTS "anchorTenantName" TEXT;
ALTER TABLE "Object" ADD COLUMN IF NOT EXISTS "priceIndicator" TEXT;

-- Create PlacementType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlacementType') THEN
        CREATE TYPE "PlacementType" AS ENUM ('standard', 'paid', 'exclusive');
    END IF;
END $$;

-- Create ModerationStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationStatus') THEN
        CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- Create PriceIndicator enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceIndicator') THEN
        CREATE TYPE "PriceIndicator" AS ENUM ('below_market', 'market', 'above_market');
    END IF;
END $$;

-- Update priceIndicator column to use enum
ALTER TABLE "Object" ALTER COLUMN "priceIndicator" TYPE "PriceIndicator" USING "priceIndicator"::"PriceIndicator";

-- Create ObjectImage table
CREATE TABLE IF NOT EXISTS "ObjectImage" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectImage_pkey" PRIMARY KEY ("id")
);

-- Create Tenant table
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

-- Create Lease table
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

-- Create Expense table
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

-- Create LegalConstraint table
CREATE TABLE IF NOT EXISTS "LegalConstraint" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalConstraint_pkey" PRIMARY KEY ("id")
);

-- Create EngineeringSpec table
CREATE TABLE IF NOT EXISTS "EngineeringSpec" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL UNIQUE,
    "electricityKw" INTEGER,
    "waterParams" TEXT,
    "gasParams" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineeringSpec_pkey" PRIMARY KEY ("id")
);

-- Create VatRate table
CREATE TABLE IF NOT EXISTS "VatRate" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL UNIQUE,
    "rate" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatRate_pkey" PRIMARY KEY ("id")
);

-- Create Moderation table
CREATE TABLE IF NOT EXISTS "Moderation" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL UNIQUE,
    "status" "ModerationStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moderation_pkey" PRIMARY KEY ("id")
);

-- Create Placement table
CREATE TABLE IF NOT EXISTS "Placement" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL UNIQUE,
    "type" "PlacementType" NOT NULL DEFAULT 'standard',
    "price" INTEGER,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- Create Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "ObjectImage_objectId_idx" ON "ObjectImage"("objectId");
CREATE INDEX IF NOT EXISTS "Tenant_objectId_idx" ON "Tenant"("objectId");
CREATE INDEX IF NOT EXISTS "Lease_objectId_idx" ON "Lease"("objectId");
CREATE INDEX IF NOT EXISTS "Lease_tenantId_idx" ON "Lease"("tenantId");
CREATE INDEX IF NOT EXISTS "Lease_endDate_idx" ON "Lease"("endDate");
CREATE INDEX IF NOT EXISTS "Expense_objectId_idx" ON "Expense"("objectId");
CREATE INDEX IF NOT EXISTS "LegalConstraint_objectId_idx" ON "LegalConstraint"("objectId");
CREATE INDEX IF NOT EXISTS "Payment_objectId_idx" ON "Payment"("objectId");

-- Add foreign keys
ALTER TABLE "ObjectImage" ADD CONSTRAINT "ObjectImage_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalConstraint" ADD CONSTRAINT "LegalConstraint_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngineeringSpec" ADD CONSTRAINT "EngineeringSpec_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VatRate" ADD CONSTRAINT "VatRate_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Moderation" ADD CONSTRAINT "Moderation_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints for existing tables
CREATE UNIQUE INDEX IF NOT EXISTS "EngineeringSpec_objectId_key" ON "EngineeringSpec"("objectId");
CREATE UNIQUE INDEX IF NOT EXISTS "VatRate_objectId_key" ON "VatRate"("objectId");
CREATE UNIQUE INDEX IF NOT EXISTS "Moderation_objectId_key" ON "Moderation"("objectId");
CREATE UNIQUE INDEX IF NOT EXISTS "Placement_objectId_key" ON "Placement"("objectId");
