-- Voice notes, doodles and photos made on one screen, so every screen in the
-- family can play and show them (they used to live only in the recording
-- screen's IndexedDB). Private bucket; files sit under <household_id>/<id>.
insert into storage.buckets (id, name, public)
values ('hub-media', 'hub-media', false)
on conflict (id) do nothing;

drop policy if exists "family reads its media" on storage.objects;
create policy "family reads its media" on storage.objects
  for select to authenticated
  using (bucket_id = 'hub-media' and public.is_household_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "family adds media" on storage.objects;
create policy "family adds media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hub-media' and public.is_household_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "family removes media" on storage.objects;
create policy "family removes media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'hub-media' and public.is_household_member(((storage.foldername(name))[1])::uuid));
