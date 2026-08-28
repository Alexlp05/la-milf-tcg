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

  return NextResponse.json({ users });
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