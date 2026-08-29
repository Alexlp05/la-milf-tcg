import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const COSTS: Record<string, number> = {
  STANDARD: 100,
  PREMIUM: 500,
  WELCOME: 999999,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { packType, count } = await req.json();
  const type = (packType || 'STANDARD') as 'STANDARD'|'PREMIUM'|'WELCOME';
  const n = Math.max(1, Math.min(Number(count)||1, 10));
  if (!COSTS[type] || type==='WELCOME') return NextResponse.json({ error: 'Type invalide' }, { status: 400 });

  // fetch dynamic cost from game_config if overridden
  const cfg = await prisma.gameConfig.findUnique({ where: { key: type==='PREMIUM' ? 'PREMIUM_PACK_COST' : 'STANDARD_PACK_COST' } });
  const unitCost = cfg ? Number(cfg.value) : COSTS[type];
  const totalCost = unitCost * n;

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { dustBalance: true } });
  if (!user || user.dustBalance < totalCost) return NextResponse.json({ error: `Poussière insuffisante (besoin ${totalCost})`, cost: totalCost }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.user.id }, data: { dustBalance: { decrement: totalCost } } });
    await tx.boosterPack.createMany({
      data: Array.from({ length: n }, () => ({ ownerId: session.user.id, packType: type as any })),
    });
  });

  const updated = await prisma.user.findUnique({ where: { id: session.user.id }, select: { dustBalance: true } });
  return NextResponse.json({ ok: true, cost: totalCost, dustBalance: updated?.dustBalance, packs: n, packType: type });
}

export async function GET() {
  const costs: any = { ...COSTS };
  const cfgs = await prisma.gameConfig.findMany({ where: { key: { in: ['STANDARD_PACK_COST','PREMIUM_PACK_COST'] } } });
  for (const c of cfgs) {
    if (c.key==='STANDARD_PACK_COST') costs.STANDARD = Number(c.value);
    if (c.key==='PREMIUM_PACK_COST') costs.PREMIUM = Number(c.value);
  }
  return NextResponse.json(costs);
}
