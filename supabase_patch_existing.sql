-- PATCH pour DB déjà créée (corrige Rarity + User)
-- À exécuter si tu as déjà lancé l'ancien schéma avec PEU_COMMUNE
DELETE FROM "card_scarcity" WHERE "rarity" = 'PEU_COMMUNE';
-- Supprime la valeur d'enum (si existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='PEU_COMMUNE' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Rarity')) THEN
    ALTER TYPE "Rarity" RENAME TO "Rarity_old";
    CREATE TYPE "Rarity" AS ENUM ('COMMUNE','RARE','ULTRA_RARE','SHINY','GOLD');
    ALTER TABLE "card_scarcity" ALTER COLUMN "rarity" TYPE "Rarity" USING "rarity"::text::"Rarity";
    ALTER TABLE "user_cards" ALTER COLUMN "pulled_rarity" TYPE "Rarity" USING "pulled_rarity"::text::"Rarity";
    DROP TYPE "Rarity_old";
  END IF;
END $$;

-- User : ajoute colonnes NextAuth
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "users" ALTER COLUMN "username" SET DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
