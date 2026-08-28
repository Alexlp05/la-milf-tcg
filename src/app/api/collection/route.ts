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
      if (!grouped[key]) {
        grouped[key] = {
          card: uc.card,
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
    });
  } catch (e: any) {
    console.error('Collection error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}