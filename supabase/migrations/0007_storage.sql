-- Nexskill migration 0007: storage buckets + policies (spec §25, §57)

insert into storage.buckets (id, name, public)
values
  ('public-assets', 'public-assets', true),
  ('submissions', 'submissions', false),
  ('certificates', 'certificates', true)
on conflict (id) do nothing;

-- public-assets: anyone can read; only the authenticated owner (folder = their user id) can write.
create policy "public-assets: public read" on storage.objects
  for select using (bucket_id = 'public-assets');
create policy "public-assets: owner write" on storage.objects
  for insert with check (bucket_id = 'public-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- submissions: private. Student can read/write their own folder; coaches/admins with course
-- review permission can read via the submission_files table join (enforced in the app layer
-- when generating signed URLs — storage RLS here is a floor, not the only check).
create policy "submissions: owner read" on storage.objects
  for select using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "submissions: owner write" on storage.objects
  for insert with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

-- certificates: publicly readable (certificates are meant to be shareable); only the server
-- (service role, which bypasses storage RLS) writes generated PDFs.
create policy "certificates: public read" on storage.objects
  for select using (bucket_id = 'certificates');
