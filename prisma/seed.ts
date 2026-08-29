import { PrismaClient, CardType, Rarity } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// SEED DATA: 8 test cards with French inside jokes
// ==========================================

const CARDS_DATA = [
  {
    id: 'card_001',
    name: 'T-Max',
    title: 'Le bouffeur de fumigène',
    type: CardType.PERSONNAGE,
    overallScore: 94,
    actionDescription: 'Écarte les bras dans la passion pour récupérer le rare.',
    actionValue: 15,
    loreAlbum: 'Les savants disent qu\'il n\'existe pas meilleur crâne rasé que celui de Ludo.',
  },
  {
    id: 'card_002',
    name: 'Le Kebab du Dimanche',
    title: 'Repas des Champions',
    type: CardType.OBJET,
    overallScore: 72,
    actionDescription: 'Restaure 30 points de dignité après une soirée trop arrosée.',
    actionValue: 30,
    loreAlbum: 'Certains disent que ce kebab a sauvé plus de vies que la Croix-Rouge.',
  },
  {
    id: 'card_003',
    name: 'Le Canapé de Max',
    title: 'Zone de Non-Droit',
    type: CardType.LIEU,
    overallScore: 65,
    actionDescription: 'Quiconque s\'y assoit perd la notion du temps pendant 6 heures.',
    actionValue: 6,
    loreAlbum: 'On raconte que personne n\'a jamais quitté ce canapé de son plein gré.',
  },
  {
    id: 'card_004',
    name: 'La Gifle Amicale',
    title: 'Tradition Ancestrale',
    type: CardType.SOUVENIR,
    overallScore: 88,
    actionDescription: 'Inflige 25 dégâts d\'amitié à un allié.',
    actionValue: 25,
    loreAlbum: 'La gifle amicale est un rituel sacré. La recevoir, c\'est être accepté.',
  },
  {
    id: 'card_005',
    name: 'DJ Kévin',
    title: 'Maître de la Playlist',
    type: CardType.PERSONNAGE,
    overallScore: 78,
    actionDescription: 'Lance une playlist qui divise le groupe en deux camps.',
    actionValue: 12,
    loreAlbum: 'Sa playlist Spotify est classée arme de destruction massive par l\'ONU.',
  },
  {
    id: 'card_006',
    name: 'Le Parking du Lidl',
    title: 'Arène Légendaire',
    type: CardType.LIEU,
    overallScore: 82,
    actionDescription: 'Tous les combattants reçoivent +10 en charisme au contact du bitume.',
    actionValue: 10,
    loreAlbum: 'C\'est ici que les plus grandes histoires ont commencé. Et fini.',
  },
  {
    id: 'card_007',
    name: 'La Phrase de Trop',
    title: 'Invocation Fatale',
    type: CardType.REFERENCE,
    overallScore: 91,
    actionDescription: 'Provoque un silence gênant de 3 tours.',
    actionValue: 3,
    loreAlbum: 'Certaines phrases ne devraient jamais être prononcées. Celle-ci a été dite trois fois.',
  },
  {
    id: 'card_008',
    name: 'Le Mec qui Connaît un Mec',
    title: 'Réseau Souterrain',
    type: CardType.PERSONNAGE,
    overallScore: 85,
    actionDescription: 'Invoque un contact mystérieux qui résout n\'importe quel problème.',
    actionValue: 20,
    loreAlbum: 'Personne ne connaît son vrai nom. Personne n\'a jamais vu son visage. Mais il a toujours un plan.',
  },
];

// Scarcity limits per rarity tier (applied to all cards)
const SCARCITY_CONFIG: { rarity: Rarity; maxSupply: number | null }[] = [
  { rarity: Rarity.COMMUNE, maxSupply: null },       // unlimited
  { rarity: Rarity.RARE, maxSupply: null },           // unlimited
  { rarity: Rarity.ULTRA_RARE, maxSupply: 20 },
  { rarity: Rarity.SHINY, maxSupply: 3 },
  { rarity: Rarity.GOLD, maxSupply: 1 },
];

// Booster slot probability config
const GAME_CONFIG = [
  {
    key: 'SLOT_1_2_WEIGHTS',
    value: JSON.stringify({
      COMMUNE: 100,
    }),
  },
  {
    key: 'SLOT_3_WEIGHTS',
    value: JSON.stringify({
      RARE: 70,
      ULTRA_RARE: 20,
      SHINY: 8,
      GOLD: 2,
    }),
  },
  {
    key: 'PREMIUM_WEIGHTS',
    value: JSON.stringify({
      ULTRA_RARE: 60,
      SHINY: 30,
      GOLD: 10,
    }),
  },
  {
    key: 'DUST_VALUES',
    value: JSON.stringify({
      COMMUNE: 5,
      RARE: 25,
      ULTRA_RARE: 100,
      SHINY: 250,
      GOLD: 500,
    }),
  },
  {
    key: 'WELCOME_PACKS_COUNT',
    value: '3',
  },
  {
    key: 'PREMIUM_PACK_COST',
    value: '500',
  },
];

async function main() {
  console.log('🃏 Seeding La Milf TCG database...\n');

  // 1. Upsert game config
  console.log('⚙️  Setting up game config...');
  for (const config of GAME_CONFIG) {
    await prisma.gameConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`   ✅ ${GAME_CONFIG.length} config entries set.\n`);

  // 2. Upsert cards
  console.log('🎴 Seeding cards...');
  for (const cardData of CARDS_DATA) {
    await prisma.card.upsert({
      where: { id: cardData.id },
      update: cardData,
      create: cardData,
    });

    // 3. Create scarcity entries for each card
    for (const scarcity of SCARCITY_CONFIG) {
      await prisma.cardScarcity.upsert({
        where: {
          cardId_rarity: {
            cardId: cardData.id,
            rarity: scarcity.rarity,
          },
        },
        update: { maxSupply: scarcity.maxSupply },
        create: {
          cardId: cardData.id,
          rarity: scarcity.rarity,
          maxSupply: scarcity.maxSupply,
          currentSupply: 0,
        },
      });
    }
  }
  console.log(`   ✅ ${CARDS_DATA.length} cards seeded with ${SCARCITY_CONFIG.length} rarity tiers each.\n`);

  // Summary
  const totalCards = await prisma.card.count();
  const totalScarcity = await prisma.cardScarcity.count();
  console.log('📊 Database summary:');
  console.log(`   Cards: ${totalCards}`);
  console.log(`   Scarcity entries: ${totalScarcity}`);
  console.log(`   Config entries: ${GAME_CONFIG.length}`);
  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
