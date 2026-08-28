-- Fix User table for NextAuth PrismaAdapter
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;
-- Make username optional (already has data, keep existing, set default "")
ALTER TABLE "users" ALTER COLUMN "username" SET DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
UPDATE "users" SET "username" = COALESCE("username", '') WHERE "username" IS NULL;
-- Verify
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;
