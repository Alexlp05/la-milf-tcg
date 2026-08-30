import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userCards = await prisma.userCard.findMany({
      where: { ownerId: session.user.id, isDusted: false },
      include: {
        card: true,
      },
      orderBy: { acquiredAt: 'desc' },
    });

    // Toutes les variantes (carte × rareté) = 8 × 5 = 40 à collectionner
    const allVariants = await prisma.cardScarcity.findMany({
      include: { card: true },
      orderBy: [{ cardId: 'asc' }, { rarity: 'asc' }],
    });
    const allCards = await prisma.card.findMany({ orderBy: { id: 'asc' } });

    const variantMap = new Map(allVariants.map(v=> [`${v.cardId}-${v.rarity}`, v]));

    const grouped: Record<string, {
      card: any;
      rarity: string;
      mintNumber: number | null;
      maxMint: number | null;
      quantity: number;
      instances: string[];
      dustValue: number;
    }> = {};

    for (const uc of userCards) {
      const key = `${uc.cardId}-${uc.pulledRarity}`;
      const variant = variantMap.get(key);
      const cardWithVariant = {
        ...uc.card,
        // illustration par variante prioritaire
        illustrationUrl: (variant as any)?.illustrationUrl || uc.card.illustrationUrl,
      };
      if (!grouped[key]) {
        grouped[key] = {
          card: cardWithVariant,
          rarity: uc.pulledRarity,
          mintNumber: uc.mintNumber,
          maxMint: uc.maxMint,
          quantity: 0,
          instances: [],
          dustValue: uc.dustValue,
        };
      }
      grouped[key].quantity++;
      grouped[key].instances.push(uc.instanceId);
    }

    // missing = variantes non possédées (par rareté)
    const ownedKeys = new Set(Object.keys(grouped)); // "card_001-COMMUNE"
    const missingVariants = allVariants.filter(v => !ownedKeys.has(`${v.cardId}-${v.rarity}`));
    // compat: missing par carte (ancienne UI) + missingVariants
    const ownedCardIds = new Set(userCards.map(u => u.cardId));
    const missing = allCards.filter(c => !ownedCardIds.has(c.id));

    return NextResponse.json({
      collection: Object.values(grouped),
      stats: {
        totalCards: userCards.length,
        uniqueCards: Object.keys(grouped).length,
        byRarity: userCards.reduce((acc, uc) => {
          acc[uc.pulledRarity] = (acc[uc.pulledRarity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      allCards,
      missing,
      totalInGame: allCards.length,
      allVariants: allVariants.map(v => ({
        cardId: v.cardId,
        card: { ...v.card, illustrationUrl: (v as any).illustrationUrl || v.card.illustrationUrl },
        rarity: v.rarity,
        maxSupply: v.maxSupply,
        illustrationUrl: (v as any).illustrationUrl || null,
      })),
      missingVariants: missingVariants.map(v => ({
        cardId: v.cardId,
        card: { ...v.card, illustrationUrl: (v as any).illustrationUrl || v.card.illustrationUrl },
        rarity: v.rarity,
        maxSupply: v.maxSupply,
        illustrationUrl: (v as any).illustrationUrl || null,
      })),
      totalVariants: allVariants.length,
    });
  } catch (e: any) {
    console.error('Collection error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}