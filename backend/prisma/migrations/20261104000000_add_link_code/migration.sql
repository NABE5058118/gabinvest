-- CreateTable
CREATE TABLE IF NOT EXISTS "LinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramId" TEXT,
    "usedAt" TIMESTAMP WITH TIME ZONE,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinkCode_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LinkCode_code_key" ON "LinkCode"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LinkCode_userId_idx" ON "LinkCode"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LinkCode_expiresAt_idx" ON "LinkCode"("expiresAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LinkCode_userId_fkey'
      AND conrelid = '"LinkCode"'::regclass
  ) THEN
    ALTER TABLE "LinkCode" ADD CONSTRAINT "LinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
