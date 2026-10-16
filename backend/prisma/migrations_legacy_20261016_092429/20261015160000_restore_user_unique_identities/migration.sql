-- Restore the unique identities on "User" that 20261010124136_deal_commission dropped.
-- Login looks a user up by phone OR email (backend/src/routes/auth.ts), so duplicate
-- credentials would make that lookup ambiguous and allow account confusion.
--
-- Any duplicate rows already present in production must be resolved manually before this
-- migration can succeed; failing loudly here is intentional and safer than silent duplication.

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
