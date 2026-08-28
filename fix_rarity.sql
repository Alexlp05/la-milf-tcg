-- Fix: Remove PEU_COMMUNE from Rarity enum
-- First, delete any scarcity entries with PEU_COMMUNE
DELETE FROM "card_scarcity" WHERE "rarity" = 'PEU_COMMUNE';

-- Then remove the enum value
ALTER TYPE "Rarity" DROP VALUE 'PEU_COMMUNE';

-- Verify
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Rarity');