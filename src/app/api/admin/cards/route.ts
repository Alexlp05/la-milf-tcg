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

// GET list all cards with scarcity
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const cards = await prisma.card.findMany({
    include: { scarcityLimits: { orderBy: { rarity: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  // Aggregate stock
  const stock = cards.map(c => ({
    card: c,
    scarcity: c.scarcityLimits.map(s => ({
      rarity: s.rarity,
      maxSupply: s.maxSupply,
      currentSupply: s.currentSupply,
      remaining: s.maxSupply === null ? null : s.maxSupply - s.currentSupply,
    })),
  }));

  // Also return all scarcity for dashboard totals
  const totals = await prisma.cardScarcity.groupBy({
    by: ['rarity'],
    _sum: { maxSupply: true, currentSupply: true },
  });

  return NextResponse.json({ cards: stock, totals });
}

// POST create new card (+ 5 scarcity rows)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, name, title, type, overallScore, illustrationUrl, iconUrl, actionDescription, actionValue, loreAlbum, scarcity } = body;

  if (!id || !name || !title || !type) return NextResponse.json({ error: 'id/name/title/type requis' }, { status: 400 });

  try {
    const card = await prisma.card.create({
      data: {
        id, name, title, type, overallScore: Number(overallScore) || 50,
        illustrationUrl: illustrationUrl || null, iconUrl: iconUrl || null,
        actionDescription: actionDescription || '', actionValue: Number(actionValue) || 0,
        loreAlbum: loreAlbum || '',
      },
    });

    // scarcity: { COMMUNE, RARE, ULTRA_RARE, SHINY, GOLD } -> maxSupply (null or number)
    const rarities: [string, number | null][] = [
      ['COMMUNE', scarcity?.COMMUNE ?? null],
      ['RARE', scarcity?.RARE ?? null],
      ['ULTRA_RARE', scarcity?.ULTRA_RARE ?? 20],
      ['SHINY', scarcity?.SHINY ?? 3],
      ['GOLD', scarcity?.GOLD ?? 1],
    ];

    for (const [rarity, maxSupply] of rarities) {
      await prisma.cardScarcity.create({
        data: { cardId: id, rarity: rarity as any, maxSupply: maxSupply === null || maxSupply === undefined ? null : Number(maxSupply), currentSupply: 0 },
      });
    }

    return NextResponse.json({ card }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH update card fields or scarcity
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, fields, scarcity } = body;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  try {
    if (fields) {
      const allowed = ['name','title','type','overallScore','illustrationUrl','iconUrl','actionDescription','actionValue','loreAlbum'];
      const data: any = {};
      for (const k of allowed) if (fields[k] !== undefined) data[k] = fields[k];
      if (data.overallScore !== undefined) data.overallScore = Number(data.overallScore);
      if (data.actionValue !== undefined) data.actionValue = Number(data.actionValue);
      await prisma.card.update({ where: { id }, data });
    }

    if (scarcity) {
      for (const [rarity, maxSupply] of Object.entries(scarcity)) {
        await prisma.cardScarcity.update({
          where: { cardId_rarity: { cardId: id, rarity: rarity as any } },
          data: { maxSupply: maxSupply === null ? null : Number(maxSupply as any) },
        });
      }
    }

    const updated = await prisma.card.findUnique({ where: { id }, include: { scarcityLimits: true } });
    return NextResponse.json({ card: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const count = await prisma.userCard.count({ where: { cardId: id } });
  if (count > 0) return NextResponse.json({ error: `Impossible: ${count} exemplaires déjà distribués` }, { status: 400 });

  await prisma.cardScarcity.deleteMany({ where: { cardId: id } });
  await prisma.card.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
