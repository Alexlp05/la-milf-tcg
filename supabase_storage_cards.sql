-- Bucket public pour illustrations cartes
insert into storage.buckets (id, name, public)
values ('cards','cards', true)
on conflict (id) do nothing;

-- Policy lecture publique
drop policy if exists "public read cards" on storage.objects;
create policy "public read cards" on storage.objects for select using (bucket_id = 'cards');

-- Policy upload réservée aux authentifiés (service_role bypass anyway)
drop policy if exists "auth upload cards" on storage.objects;
create policy "auth upload cards" on storage.objects for insert with check (bucket_id = 'cards');

drop policy if exists "auth update cards" on storage.objects;
create policy "auth update cards" on storage.objects for update using (bucket_id = 'cards');

drop policy if exists "auth delete cards" on storage.objects;
create policy "auth delete cards" on storage.objects for delete using (bucket_id = 'cards');
