import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserStatus, UserRole } from '@prisma/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Non authentifié', status: 401 };
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== 'ADMIN') return { error: 'Accès refusé', status: 403 };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const users = await prisma.user.findMany({
    include: {
      _count: { select: { cards: true, boosters: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Enrich with rarity breakdown + score
  const enriched = await Promise.all(users.map(async (u) => {
    const cards = await prisma.userCard.findMany({
      where: { ownerId: u.id, isDusted: false },
      include: { card: true },
    });
    const byRarity: Record<string, number> = {};
    let score = 0;
    for (const c of cards) {
      byRarity[c.pulledRarity] = (byRarity[c.pulledRarity] || 0) + 1;
      score += c.card.overallScore + (c.pulledRarity==='GOLD'?500:c.pulledRarity==='SHINY'?250:c.pulledRarity==='ULTRA_RARE'?100:c.pulledRarity==='RARE'?25:5);
    }
    const unique = new Set(cards.map(c=> `${c.cardId}-${c.pulledRarity}`)).size;
    return { ...u, stats: { byRarity, score, total: cards.length, unique } };
  }));

  // ranking by score desc
  enriched.sort((a,b)=> b.stats.score - a.stats.score);
  return NextResponse.json({ users: enriched });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, status, role } = await req.json();

  if (userId === auth.user.id && (status === 'BANNED' || role === 'PLAYER')) {
    return NextResponse.json({ error: 'Action interdite sur son propre compte' }, { status: 400 });
  }

  const updateData: { status?: UserStatus; role?: UserRole; approvedAt?: Date | null } = {};
  if (status) updateData.status = status as UserStatus;
  if (role) updateData.role = role as UserRole;
  if (status === 'APPROVED') updateData.approvedAt = new Date();
  if (status === 'PENDING') updateData.approvedAt = null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  if (userId === auth.user.id) return NextResponse.json({ error: 'Impossible de se supprimer soi-même' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.userCard.deleteMany({ where: { ownerId: userId } });
    await tx.boosterPack.deleteMany({ where: { ownerId: userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { userId, action } = await req.json();
  if (!userId || action !== 'reset') return NextResponse.json({ error: 'action reset requis' }, { status: 400 });
  if (userId === auth.user.id) return NextResponse.json({ error: 'Impossible de se reset soi-même' }, { status: 400 });
  // reset: supprime cartes + boosters, dust 0, remet PENDING?
  await prisma.$transaction(async (tx) => {
    // libère les stocks limités : décrémente currentSupply pour chaque variante possédée
    const cards = await tx.userCard.findMany({ where: { ownerId: userId, isDusted: false }, select: { cardId: true, pulledRarity: true } });
    for (const c of cards) {
      await tx.cardScarcity.updateMany({
        where: { cardId: c.cardId, rarity: c.pulledRarity as any },
        data: { currentSupply: { decrement: 1 } },
      });
    }
    await tx.userCard.deleteMany({ where: { ownerId: userId } });
    await tx.boosterPack.deleteMany({ where: { ownerId: userId } });
    await tx.user.update({ where: { id: userId }, data: { dustBalance: 0 } });
  });
  return NextResponse.json({ ok: true });
}