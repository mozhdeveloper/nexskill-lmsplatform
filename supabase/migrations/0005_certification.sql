-- Nexskill migration 0005: certificates + blockchain anchoring records

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  certificate_number text not null unique,
  student_id uuid not null references public.profiles (id),
  course_id uuid not null references public.courses (id),
  coach_profile_id uuid not null references public.coach_profiles (id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'issued' check (status in ('pending', 'issued', 'revoked')),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id),
  revoked_reason text,
  payload_hash text not null,
  pdf_media_id uuid references public.media_assets (id)
);

create index idx_certificates_student on public.certificates (student_id);

create table public.certificate_blockchain_records (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null unique references public.certificates (id) on delete cascade,
  chain text,
  transaction_hash text,
  block_reference text,
  anchored_at timestamptz,
  verification_status text not null default 'unanchored' check (verification_status in ('unanchored', 'pending', 'anchored', 'failed'))
);

alter table public.certificates enable row level security;
alter table public.certificate_blockchain_records enable row level security;

-- Certificates are publicly readable (verification is meant to work signed-out, §104) but the
-- verification API route selects only the non-sensitive columns it needs — this policy just
-- controls DB-level access, not what the API chooses to expose.
create policy "certificates: public read" on public.certificates for select using (true);
-- Deliberately no student-facing insert policy: issuance only happens through the completion
-- engine's server-side domain function using the service-role client, after it has itself
-- verified the completion rules were met. A student's own session key can never self-issue.
create policy "certificates: admin insert" on public.certificates
  for insert with check (public.is_admin(auth.uid()));
create policy "certificates: admin revoke" on public.certificates
  for update using (public.is_admin(auth.uid()));

create policy "certificate_blockchain_records: public read" on public.certificate_blockchain_records for select using (true);
create policy "certificate_blockchain_records: system write" on public.certificate_blockchain_records
  for all using (public.is_admin(auth.uid()));
