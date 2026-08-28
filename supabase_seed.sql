-- ==========================================
-- SEED La Milf TCG : 8 cartes + 5 raretés + config
-- À exécuter APRÈS le schéma dans Supabase SQL Editor
-- ==========================================

-- Config jeu
INSERT INTO "game_config" ("key", "value") VALUES
  ('SLOT_1_2_WEIGHTS', '{"COMMUNE":100}'),
  ('SLOT_3_WEIGHTS', '{"RARE":70,"ULTRA_RARE":20,"SHINY":8,"GOLD":2}'),
  ('DUST_VALUES', '{"COMMUNE":5,"RARE":25,"ULTRA_RARE":100,"SHINY":250,"GOLD":500}'),
  ('WELCOME_PACKS_COUNT', '3'),
  ('PREMIUM_PACK_COST', '500')
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";

-- Cartes
INSERT INTO "cards" ("id","name","title","type","overall_score","action_description","action_value","lore_album") VALUES
  ('card_001','T-Max','Le bouffeur de fumigène','PERSONNAGE',94,'Écarte les bras dans la passion pour récupérer le rare.',15,'Les savants disent qu''il n''existe pas meilleur crâne rasé que celui de Ludo.'),
  ('card_002','Le Kebab du Dimanche','Repas des Champions','OBJET',72,'Restaure 30 points de dignité après une soirée trop arrosée.',30,'Certains disent que ce kebab a sauvé plus de vies que la Croix-Rouge.'),
  ('card_003','Le Canapé de Max','Zone de Non-Droit','LIEU',65,'Quiconque s''y assoit perd la notion du temps pendant 6 heures.',6,'On raconte que personne n''a jamais quitté ce canapé de son plein gré.'),
  ('card_004','La Gifle Amicale','Tradition Ancestrale','SOUVENIR',88,'Inflige 25 dégâts d''amitié à un allié.',25,'La gifle amicale est un rituel sacré. La recevoir, c''est être accepté.'),
  ('card_005','DJ Kévin','Maître de la Playlist','PERSONNAGE',78,'Lance une playlist qui divise le groupe en deux camps.',12,'Sa playlist Spotify est classée arme de destruction massive par l''ONU.'),
  ('card_006','Le Parking du Lidl','Arène Légendaire','LIEU',82,'Tous les combattants reçoivent +10 en charisme au contact du bitume.',10,'C''est ici que les plus grandes histoires ont commencé. Et fini.'),
  ('card_007','La Phrase de Trop','Invocation Fatale','REFERENCE',91,'Provoque un silence gênant de 3 tours.',3,'Certaines phrases ne devraient jamais être prononcées. Celle-ci a été dite trois fois.'),
  ('card_008','Le Mec qui Connaît un Mec','Réseau Souterrain','PERSONNAGE',85,'Invoque un contact mystérieux qui résout n''importe quel problème.',20,'Personne ne connaît son vrai nom. Personne n''a jamais vu son visage. Mais il a toujours un plan.')
ON CONFLICT ("id") DO UPDATE SET
  "name"=EXCLUDED."name", "title"=EXCLUDED."title", "type"=EXCLUDED."type",
  "overall_score"=EXCLUDED."overall_score", "action_description"=EXCLUDED."action_description",
  "action_value"=EXCLUDED."action_value", "lore_album"=EXCLUDED."lore_album";

-- Scarcity : 5 raretés par carte (40 lignes)
-- Nettoie l'ancienne rareté PEU_COMMUNE si elle existe encore
DELETE FROM "card_scarcity" WHERE "rarity" = 'PEU_COMMUNE';

INSERT INTO "card_scarcity" ("card_id","rarity","max_supply","current_supply") VALUES
  ('card_001','COMMUNE',NULL,0),('card_001','RARE',NULL,0),('card_001','ULTRA_RARE',20,0),('card_001','SHINY',3,0),('card_001','GOLD',1,0),
  ('card_002','COMMUNE',NULL,0),('card_002','RARE',NULL,0),('card_002','ULTRA_RARE',20,0),('card_002','SHINY',3,0),('card_002','GOLD',1,0),
  ('card_003','COMMUNE',NULL,0),('card_003','RARE',NULL,0),('card_003','ULTRA_RARE',20,0),('card_003','SHINY',3,0),('card_003','GOLD',1,0),
  ('card_004','COMMUNE',NULL,0),('card_004','RARE',NULL,0),('card_004','ULTRA_RARE',20,0),('card_004','SHINY',3,0),('card_004','GOLD',1,0),
  ('card_005','COMMUNE',NULL,0),('card_005','RARE',NULL,0),('card_005','ULTRA_RARE',20,0),('card_005','SHINY',3,0),('card_005','GOLD',1,0),
  ('card_006','COMMUNE',NULL,0),('card_006','RARE',NULL,0),('card_006','ULTRA_RARE',20,0),('card_006','SHINY',3,0),('card_006','GOLD',1,0),
  ('card_007','COMMUNE',NULL,0),('card_007','RARE',NULL,0),('card_007','ULTRA_RARE',20,0),('card_007','SHINY',3,0),('card_007','GOLD',1,0),
  ('card_008','COMMUNE',NULL,0),('card_008','RARE',NULL,0),('card_008','ULTRA_RARE',20,0),('card_008','SHINY',3,0),('card_008','GOLD',1,0)
ON CONFLICT ("card_id","rarity") DO UPDATE SET "max_supply"=EXCLUDED."max_supply";

-- Vérif
SELECT 'cards' as tbl, count(*) FROM "cards" UNION ALL
SELECT 'card_scarcity', count(*) FROM "card_scarcity" UNION ALL
SELECT 'game_config', count(*) FROM "game_config";
