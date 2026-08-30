import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { action } = await req.json(); // accept | reject | cancel
  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade) return NextResponse.json({ error: 'Trade non trouvé' }, { status: 404 });
  if (trade.status !== 'PENDING') return NextResponse.json({ error: 'Déjà traité' }, { status: 400 });

  if (action === 'cancel') {
    if (trade.fromUserId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    const updated = await prisma.trade.update({ where: { id }, data: { status: 'CANCELLED', decidedAt: new Date() } });
    return NextResponse.json({ trade: updated });
  }
  if (action === 'reject') {
    if (trade.toUserId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    const updated = await prisma.trade.update({ where: { id }, data: { status: 'REJECTED', decidedAt: new Date() } });
    return NextResponse.json({ trade: updated });
  }
  if (action === 'accept') {
    if (trade.toUserId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    // Vérifie que les cartes sont encore possédées et dust suffisant
    const offered = await prisma.userCard.findUnique({ where: { instanceId: trade.offeredInstanceId } });
    const requested = trade.requestedInstanceId ? await prisma.userCard.findUnique({ where: { instanceId: trade.requestedInstanceId } }) : null;
    if (!offered || offered.ownerId !== trade.fromUserId || offered.isDusted) return NextResponse.json({ error: 'Carte offerte plus disponible' }, { status: 400 });
    if (trade.requestedInstanceId && (!requested || requested.ownerId !== trade.toUserId || requested.isDusted)) return NextResponse.json({ error: 'Ta carte demandée plus disponible' }, { status: 400 });

    const fromUser = await prisma.user.findUnique({ where: { id: trade.fromUserId } });
    if (!fromUser || fromUser.dustBalance < trade.dustFee) return NextResponse.json({ error: `Offreur n’a plus assez de poussière (${trade.dustFee})` }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      // burn fee
      await tx.user.update({ where: { id: trade.fromUserId }, data: { dustBalance: { decrement: trade.dustFee } } });
      // swap
      await tx.userCard.update({ where: { instanceId: trade.offeredInstanceId }, data: { ownerId: trade.toUserId } });
      if (trade.requestedInstanceId) {
        await tx.userCard.update({ where: { instanceId: trade.requestedInstanceId }, data: { ownerId: trade.fromUserId } });
      }
      await tx.trade.update({ where: { id }, data: { status: 'ACCEPTED', decidedAt: new Date() } });
    });

    const updated = await prisma.trade.findUnique({ where: { id } });
    return NextResponse.json({ trade: updated });
  }
  return NextResponse.json({ error: 'action invalide' }, { status: 400 });
}
