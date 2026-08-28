import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PackType } from '@prisma/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Non authentifié', status: 401 };
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== 'ADMIN') return { error: 'Accès refusé', status: 403 };
  return { user };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, packType, count, allUsers } = await req.json();

  if (!userId && !allUsers) {
    return NextResponse.json({ error: 'userId ou allUsers requis' }, { status: 400 });
  }

  const type = (packType || 'STANDARD') as PackType;
  const num = Math.max(1, Math.min(count || 1, 50));

  let targetUsers: string[] = [];
  if (allUsers) {
    const users = await prisma.user.findMany({
      where: { status: 'APPROVED' },
      select: { id: true },
    });
    targetUsers = users.map(u => u.id);
  } else {
    targetUsers = [userId];
  }

  const packs = await prisma.boosterPack.createMany({
    data: targetUsers.flatMap(userId =>
      Array.from({ length: num }, () => ({
        ownerId: userId,
        packType: type,
        status: 'UNOPENED',
      }))
    ),
  });

  return NextResponse.json({ created: packs.count, users: targetUsers.length });
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const packs = await prisma.boosterPack.findMany({
    include: { owner: { select: { id: true, username: true, email: true } } },
    orderBy: { grantedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ packs });
}