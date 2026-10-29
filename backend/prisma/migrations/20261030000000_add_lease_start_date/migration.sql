-- AlterTable
ALTER TABLE "Object" ADD COLUMN      "leaseStartDate" TIMESTAMP WITH TIME ZONE;

-- CreateIndex
CREATE INDEX "Object_leaseStartDate_idx" ON "Object"("leaseStartDate");
