import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { instanceId } = await req.json();
    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId requis' }, { status: 400 });
    }

    const userCard = await prisma.userCard.findUnique({
      where: { instanceId },
      include: { card: true },
    });

    if (!userCard || userCard.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Carte non trouvée' }, { status: 404 });
    }

    if (userCard.isDusted) {
      return NextResponse.json({ error: 'Déjà recyclée' }, { status: 400 });
    }

    // Autorise tout doublon : vérifie qu'il reste au moins 1 exemplaire de la même variante
    const sameVariantCount = await prisma.userCard.count({
      where: { ownerId: session.user.id, cardId: userCard.cardId, pulledRarity: userCard.pulledRarity, isDusted: false },
    });
    if (sameVariantCount <= 1) {
      return NextResponse.json({ error: 'Impossible de recycler ton dernier exemplaire de cette variante' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userCard.update({
        where: { instanceId },
        data: { isDusted: true },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { dustBalance: { increment: userCard.dustValue } },
      });
    });

    return NextResponse.json({ dustGained: userCard.dustValue });
  } catch (e: any) {
    console.error('Dust error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}