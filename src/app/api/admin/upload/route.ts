import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin, supabaseUrl } from '@/lib/supabase';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!u || u.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Storage non configuré : ajoute NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY dans .env (Supabase → Project Settings → API)' }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const cardId = (form.get('cardId') as string) || `upload_${Date.now()}`;
  if (!file) return NextResponse.json({ error: 'file manquant' }, { status: 400 });

  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd (max 5MB)' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Image uniquement' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'webp';
  const path = `cards/${cardId}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from('cards').upload(path, buf, {
    contentType: file.type,
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    // bucket may not exist - try create then retry
    if (error.message.includes('Bucket not found')) {
      return NextResponse.json({ error: 'Bucket "cards" introuvable. Exécute dans SQL Editor : insert into storage.buckets (id,name,public) values (\'cards\',\'cards\',true) on conflict do nothing; + crée la policy public read.' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from('cards').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
