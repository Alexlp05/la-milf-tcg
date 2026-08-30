import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Rarity, PackType } from '@prisma/client';

interface SlotConfig {
  rarity: Rarity;
  weight: number;
}

async function getConfig(key: string): Promise<any> {
  const config = await prisma.gameConfig.findUnique({ where: { key } });
  return config ? JSON.parse(config.value) : null;
}

async function getSlotWeights(slot: 1 | 2 | 3): Promise<SlotConfig[]> {
  const key = slot <= 2 ? 'SLOT_1_2_WEIGHTS' : 'SLOT_3_WEIGHTS';
  const weights = await getConfig(key);
  if (!weights) return [];
  return Object.entries(weights).map(([rarity, weight]) => ({
    rarity: rarity as Rarity,
    weight: weight as number,
  }));
}
async function getPremiumWeights(): Promise<SlotConfig[]> {
  const weights = await getConfig('PREMIUM_WEIGHTS');
  if (!weights) return [{ rarity: 'ULTRA_RARE' as Rarity, weight: 60 }, { rarity: 'SHINY' as Rarity, weight: 30 }, { rarity: 'GOLD' as Rarity, weight: 10 }];
  return Object.entries(weights).map(([rarity, weight]) => ({
    rarity: rarity as Rarity,
    weight: weight as number,
  }));
}

function pickRarity(weights: SlotConfig[]): Rarity {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  for (const w of weights) {
    random -= w.weight;
    if (random <= 0) return w.rarity;
  }
  return weights[weights.length - 1].rarity;
}

async function pickCardForRarity(rarity: Rarity): Promise<{ id: string; name: string; title: string; type: string; overallScore: number; actionDescription: string; actionValue: number; illustrationUrl: string | null; iconUrl: string | null; loreAlbum: string; variantIllustrationUrl: string | null; isNew?: boolean } | null> {
  const scarcityEntries = await prisma.cardScarcity.findMany({
    where: { rarity },
    include: { card: true },
  });

  const available = scarcityEntries.filter(s => 
    s.maxSupply === null || s.currentSupply < (s.maxSupply ?? Infinity)
  );

  if (available.length === 0) return null;
  const picked = available[Math.floor(Math.random() * available.length)];
  return {
    id: picked.card.id,
    name: picked.card.name,
    title: picked.card.title,
    type: picked.card.type,
    overallScore: picked.card.overallScore,
    actionDescription: picked.card.actionDescription,
    actionValue: picked.card.actionValue,
    illustrationUrl: (picked as any).illustrationUrl || picked.card.illustrationUrl,
    iconUrl: picked.card.iconUrl,
    loreAlbum: picked.card.loreAlbum,
    variantIllustrationUrl: (picked as any).illustrationUrl || null,
  };
}

async function claimCard(cardId: string, rarity: Rarity, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const scarcity = await tx.cardScarcity.findUnique({
      where: { cardId_rarity: { cardId, rarity } },
    });

    if (!scarcity) throw new Error('Scarcity entry not found');
    if (scarcity.maxSupply !== null && scarcity.currentSupply >= scarcity.maxSupply) {
      throw new Error('Card supply exhausted');
    }

    const maxMint = scarcity.maxSupply ?? null;
    const mintNumber = maxMint ? scarcity.currentSupply + 1 : null;

    await tx.cardScarcity.update({
      where: { cardId_rarity: { cardId, rarity } },
      data: { currentSupply: { increment: 1 } },
    });

    const dustValues = await getConfig('DUST_VALUES');
    const dustValue = dustValues?.[rarity] ?? 0;

    const userCard = await tx.userCard.create({
      data: {
        cardId,
        ownerId: userId,
        pulledRarity: rarity,
        mintNumber,
        maxMint,
        dustValue,
      },
    });

    return { userCard, mintNumber, maxMint, dustValue };
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const packs = await prisma.boosterPack.findMany({
      where: { ownerId: session.user.id, status: 'UNOPENED' },
      select: { id: true, packType: true, grantedAt: true },
      orderBy: { grantedAt: 'desc' },
    });

    return NextResponse.json({ packs });
  } catch (e: any) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Compte non approuvé' }, { status: 403 });
    }

    const body = await req.json();
    const packId = body.packId as string;

    const pack = await prisma.boosterPack.findUnique({ where: { id: packId } });
    if (!pack || pack.ownerId !== user.id || pack.status !== 'UNOPENED') {
      return NextResponse.json({ error: 'Booster invalide ou déjà ouvert' }, { status: 400 });
    }

    const isPremium = pack.packType === 'PREMIUM';
    const cardCount = isPremium ? 2 : 3;
    const slot1Weights = await getSlotWeights(1);
    const slot2Weights = await getSlotWeights(2);
    const slot3Weights = await getSlotWeights(3);
    const premiumWeights = await getPremiumWeights();

    // Pré-calcul isNew : variantes déjà possédées avant ouverture
    const existingKeys = new Set((await prisma.userCard.findMany({ where: { ownerId: user.id, isDusted: false }, select: { cardId: true, pulledRarity: true } })).map(c=> `${c.cardId}-${c.pulledRarity}`));
    const existingCardIds = new Set((await prisma.userCard.findMany({ where: { ownerId: user.id, isDusted: false }, select: { cardId: true } })).map(c=> c.cardId));

    const results = [];

    for (let i = 0; i < cardCount; i++) {
      const weights = isPremium ? premiumWeights : (i < 2 ? slot1Weights : slot3Weights);
      let card: any = null;
      let rarity: Rarity | null = null;
      let attempts = 0;

      while (!card && attempts < 10) {
        const pickedRarity = pickRarity(weights);
        card = await pickCardForRarity(pickedRarity);
        if (card) rarity = pickedRarity;
        attempts++;
      }

      if (!card || !rarity) {
        return NextResponse.json({ error: 'Impossible de générer les cartes (stock épuisé)' }, { status: 500 });
      }

      const key = `${card.id}-${rarity}`;
      const isNewVariant = !existingKeys.has(key);
      const isNewCard = !existingCardIds.has(card.id);
      // ajoute à set pour que le 2e tirage du même pack détecte doublon intra-pack comme isNew false si déjà tiré dans ce pack
      existingKeys.add(key); existingCardIds.add(card.id);

      const claimed = await claimCard(card.id, rarity, user.id);
      results.push({
        instanceId: claimed.userCard.instanceId,
        card: {
          id: card.id,
          name: card.name,
          title: card.title,
          type: card.type,
          overallScore: card.overallScore,
          actionDescription: card.actionDescription,
          actionValue: card.actionValue,
          illustrationUrl: card.illustrationUrl,
          iconUrl: card.iconUrl,
          loreAlbum: card.loreAlbum,
          variantIllustrationUrl: card.variantIllustrationUrl,
        },
        rarity,
        mintNumber: claimed.mintNumber,
        maxMint: claimed.maxMint,
        dustValue: claimed.dustValue,
        isNewVariant,
        isNewCard,
      });
    }

    await prisma.boosterPack.update({
      where: { id: packId },
      data: { status: 'OPENED', openedAt: new Date() },
    });

    return NextResponse.json({ cards: results });
  } catch (e: any) {
    console.error('Open pack error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}