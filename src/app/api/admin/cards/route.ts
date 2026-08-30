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
      illustrationUrl: (s as any).illustrationUrl || null,
    })),
  }));

  // Also return all scarcity for dashboard totals
  const totals = await prisma.cardScarcity.groupBy({
    by: ['rarity'],
    _sum: { maxSupply: true, currentSupply: true },
  });

  return NextResponse.json({ cards: stock, totals });
}

// POST create new card (+ scarcity only for existing variants)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, name, title, type, overallScore, illustrationUrl, iconUrl, actionDescription, actionValue, loreAlbum, scarcity, illustrations } = body;

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

    // scarcity: { COMMUNE: null|number, RARE: ... } ; absent key or undefined = variante n'existe pas (pas de ligne)
    // null = illimité, number = limité, undefined = n'existe pas
    const rarities: [string, any][] = [
      ['COMMUNE', scarcity?.COMMUNE],
      ['RARE', scarcity?.RARE],
      ['ULTRA_RARE', scarcity?.ULTRA_RARE],
      ['SHINY', scarcity?.SHINY],
      ['GOLD', scarcity?.GOLD],
    ];

    for (const [rarity, val] of rarities) {
      if (val === undefined || val === 'NONE') continue; // n'existe pas
      const maxSupply = val === null || val === '' ? null : Number(val);
      const variantUrl = illustrations?.[rarity] || null;
      await prisma.cardScarcity.create({
        data: { cardId: id, rarity: rarity as any, maxSupply, currentSupply: 0, illustrationUrl: variantUrl },
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
      for (const [rarity, val] of Object.entries(scarcity as any)) {
        if (val === 'NONE') {
          const existing = await prisma.cardScarcity.findUnique({ where: { cardId_rarity: { cardId: id, rarity: rarity as any } } });
          if (existing && existing.currentSupply > 0) return NextResponse.json({ error: `Impossible de supprimer ${rarity} : ${existing.currentSupply} déjà distribués` }, { status: 400 });
          await prisma.cardScarcity.deleteMany({ where: { cardId: id, rarity: rarity as any } });
        } else if (val === undefined) {
          continue;
        } else {
          const maxSupply = val === null || val === '' ? null : Number(val as any);
          await prisma.cardScarcity.upsert({
            where: { cardId_rarity: { cardId: id, rarity: rarity as any } },
            update: { maxSupply },
            create: { cardId: id, rarity: rarity as any, maxSupply, currentSupply: 0 },
          });
        }
      }
    }
    const illustrations = body.illustrations as any;
    if (illustrations) {
      for (const [rarity, url] of Object.entries(illustrations)) {
        if (url === undefined) continue;
        await prisma.cardScarcity.updateMany({ where: { cardId: id, rarity: rarity as any }, data: { illustrationUrl: url || null } });
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
