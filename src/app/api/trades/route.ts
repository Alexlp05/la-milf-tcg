import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function tradeFee(): Promise<number> {
  const cfg = await prisma.gameConfig.findUnique({ where: { key: 'TRADE_FEE' } });
  return cfg ? Number(cfg.value) : 500;
}

// GET list my trades (incoming + outgoing)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const me = session.user.id;
  const trades = await prisma.trade.findMany({
    where: { OR: [{ fromUserId: me }, { toUserId: me }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  // enrich with card info
  const ids = trades.flatMap(t=> [t.offeredInstanceId, t.requestedInstanceId].filter(Boolean) as string[]);
  const cards = await prisma.userCard.findMany({ where: { instanceId: { in: ids } }, include: { card: true } });
  const map = new Map(cards.map(c=> [c.instanceId, c]));
  const enriched = trades.map(t=> ({
    ...t,
    offered: map.get(t.offeredInstanceId) || null,
    requested: t.requestedInstanceId ? map.get(t.requestedInstanceId) || null : null,
  }));
  const fee = await tradeFee();
  return NextResponse.json({ trades: enriched, fee });
}

// POST propose trade
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { toUserId, toEmail, offeredInstanceId, requestedInstanceId } = await req.json();

  let targetId = toUserId;
  if (!targetId && toEmail) {
    const u = await prisma.user.findUnique({ where: { email: toEmail } });
    if (!u) return NextResponse.json({ error: 'Utilisateur cible non trouvé' }, { status: 404 });
    targetId = u.id;
  }
  if (!targetId || !offeredInstanceId) return NextResponse.json({ error: 'toUserId/toEmail + offeredInstanceId requis' }, { status: 400 });
  if (targetId === session.user.id) return NextResponse.json({ error: 'Impossible de s’échanger à soi-même' }, { status: 400 });

  const fee = await tradeFee();
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me || me.dustBalance < fee) return NextResponse.json({ error: `Poussière insuffisante (besoin ${fee})` }, { status: 400 });

  const offered = await prisma.userCard.findUnique({ where: { instanceId: offeredInstanceId }, include: { card: true } });
  if (!offered || offered.ownerId !== session.user.id || offered.isDusted) return NextResponse.json({ error: 'Carte offerte invalide' }, { status: 400 });

  let requested = null;
  if (requestedInstanceId) {
    requested = await prisma.userCard.findUnique({ where: { instanceId: requestedInstanceId } });
    if (!requested || requested.ownerId !== targetId || requested.isDusted) return NextResponse.json({ error: 'Carte demandée invalide' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.status !== 'APPROVED') return NextResponse.json({ error: 'Cible non approuvée' }, { status: 400 });

  const trade = await prisma.trade.create({
    data: { fromUserId: session.user.id, toUserId: targetId, offeredInstanceId, requestedInstanceId: requestedInstanceId || null, dustFee: fee, status: 'PENDING' },
  });
  return NextResponse.json({ trade }, { status: 201 });
}
