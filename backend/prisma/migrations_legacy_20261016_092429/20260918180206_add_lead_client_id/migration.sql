-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE INDEX "Lead_clientId_idx" ON "Lead"("clientId");
