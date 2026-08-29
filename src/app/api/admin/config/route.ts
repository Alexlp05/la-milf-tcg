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

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const configs = await prisma.gameConfig.findMany();
  const out: any = {};
  for (const c of configs) {
    try { out[c.key] = JSON.parse(c.value); } catch { out[c.key] = c.value; }
  }
  return NextResponse.json(out);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json();
  // body: { key: value } where value is object or string
  for (const [key, value] of Object.entries(body)) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    await prisma.gameConfig.upsert({
      where: { key },
      update: { value: str },
      create: { key, value: str },
    });
  }
  return NextResponse.json({ ok: true });
}
