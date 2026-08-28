import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, username: true, name: true, image: true, avatarUrl: true, role: true, status: true, dustBalance: true },
  });
  if (!user) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

  const [packCount, cardCount, uniqueCount] = await Promise.all([
    prisma.boosterPack.count({ where: { ownerId: user.id, status: 'UNOPENED' } }),
    prisma.userCard.count({ where: { ownerId: user.id, isDusted: false } }),
    prisma.userCard.groupBy({ by: ['cardId', 'pulledRarity'], where: { ownerId: user.id, isDusted: false } }).then(g => g.length),
  ]);

  return NextResponse.json({
    user: { ...user, image: user.image || user.avatarUrl },
    stats: { unopenedPacks: packCount, totalCards: cardCount, uniqueCards: uniqueCount },
  });
}
