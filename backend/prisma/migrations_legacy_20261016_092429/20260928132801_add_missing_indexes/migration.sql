/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ObjectImage` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_objectId_fkey";

-- AlterTable
ALTER TABLE "ObjectImage" DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "Consent_consentType_idx" ON "Consent"("consentType");

-- CreateIndex
CREATE INDEX "Consent_acceptedAt_idx" ON "Consent"("acceptedAt");

-- CreateIndex
CREATE INDEX "Lead_objectId_idx" ON "Lead"("objectId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Moderation_status_idx" ON "Moderation"("status");

-- CreateIndex
CREATE INDEX "Object_city_idx" ON "Object"("city");

-- CreateIndex
CREATE INDEX "Object_type_idx" ON "Object"("type");

-- CreateIndex
CREATE INDEX "Object_price_idx" ON "Object"("price");

-- CreateIndex
CREATE INDEX "Object_area_idx" ON "Object"("area");

-- CreateIndex
CREATE INDEX "Object_yieldPercent_idx" ON "Object"("yieldPercent");

-- CreateIndex
CREATE INDEX "Object_leaseEndDate_idx" ON "Object"("leaseEndDate");

-- CreateIndex
CREATE INDEX "Object_createdAt_idx" ON "Object"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
