import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Non authentifié', status: 401 };
  const u = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!u || u.role !== 'ADMIN') return { error: 'Accès refusé', status: 403 };
  return { user: u };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

  const cards = await prisma.userCard.findMany({
    where: { ownerId: userId, isDusted: false },
    include: { card: true },
    orderBy: { acquiredAt: 'desc' },
  });

  const grouped: any[] = [];
  const map = new Map<string, any>();
  for (const c of cards) {
    const k = `${c.cardId}-${c.pulledRarity}`;
    if (!map.has(k)) map.set(k, { card: c.card, rarity: c.pulledRarity, quantity: 0, instances: [], mintNumber: c.mintNumber, maxMint: c.maxMint, dustValue: c.dustValue });
    const g = map.get(k); g.quantity++; g.instances.push(c.instanceId);
  }
  for (const v of map.values()) grouped.push(v);

  return NextResponse.json({ collection: grouped, total: cards.length });
}
