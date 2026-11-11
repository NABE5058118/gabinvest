-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Case" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "price" INTEGER,
    "imageBefore" TEXT,
    "imageAfter" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CaseImage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Case_createdAt_idx" ON "Case"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseImage_caseId_idx" ON "CaseImage"("caseId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CaseImage_caseId_fkey'
      AND conrelid = '"CaseImage"'::regclass
  ) THEN
    ALTER TABLE "CaseImage" ADD CONSTRAINT "CaseImage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
