-- Nexskill migration 0002: coach applications, coach profiles, sub-coach team scoping

create table public.coach_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  public_name text not null,
  legal_name text not null,
  country text not null,
  bio text not null,
  expertise text[] not null default '{}',
  years_experience int,
  qualifications text,
  portfolio_url text,
  social_links jsonb not null default '{}',
  proposed_categories text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'additional_information_required', 'approved', 'rejected', 'suspended')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.coach_applications
  for each row execute procedure public.set_updated_at();

create table public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  application_id uuid references public.coach_applications (id),
  slug text not null unique,
  headline text,
  verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  default_commission_rate numeric(5, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.coach_profiles
  for each row execute procedure public.set_updated_at();

-- Sub-coach / assistant coach scoped grants (spec §5).
create table public.coach_team_members (
  id uuid primary key default gen_random_uuid(),
  coach_profile_id uuid not null references public.coach_profiles (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  scope_type text not null check (scope_type in ('account', 'course', 'cohort', 'module', 'student_group')),
  scope_id uuid,
  permission_keys text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint scope_id_matches_type check (
    (scope_type = 'account' and scope_id is null) or
    (scope_type <> 'account' and scope_id is not null)
  ),
  -- Payouts and pricing may never be delegated to a sub-coach, regardless of scope (§5).
  constraint no_financial_delegation check (
    not (permission_keys && array['payout.view', 'payout.request', 'course.set_price', 'account.delete'])
  )
);

create index idx_coach_team_members_coach on public.coach_team_members (coach_profile_id);
create index idx_coach_team_members_member on public.coach_team_members (member_id);

-- Resolves whether p_user_id may exercise p_permission_key against a specific course.
-- Order: admin -> platform-wide moderation permission -> course owner (coach) with role
-- permission -> scoped sub-coach grant.
create function public.has_course_permission(p_user_id uuid, p_course_id uuid, p_permission_key text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if public.is_admin(p_user_id) then
    return true;
  end if;

  -- course.unpublish is a platform moderation capability (content_moderator role, §7/§49) —
  -- it applies to any course, not just ones the caller owns, unlike course.edit/publish and
  -- submission.review/pass which are inherently ownership- or grant-scoped.
  if p_permission_key = 'course.unpublish' and public.has_permission(p_user_id, 'course.unpublish') then
    return true;
  end if;

  select cp.user_id into v_owner_id
  from public.courses c
  join public.coach_profiles cp on cp.id = c.coach_profile_id
  where c.id = p_course_id;

  if v_owner_id = p_user_id and public.has_permission(p_user_id, p_permission_key) then
    return true;
  end if;

  return exists (
    select 1
    from public.coach_team_members ctm
    join public.courses c on c.id = p_course_id
    where ctm.member_id = p_user_id
      and public.is_active(p_user_id)
      and ctm.status = 'active'
      and ctm.coach_profile_id = c.coach_profile_id
      and p_permission_key = any (ctm.permission_keys)
      and (
        ctm.scope_type = 'account'
        or (ctm.scope_type = 'course' and ctm.scope_id = p_course_id)
      )
  );
end;
$$;

alter table public.coach_applications enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.coach_team_members enable row level security;

create policy "coach_applications: applicant read own" on public.coach_applications
  for select using (auth.uid() = applicant_id or public.is_admin(auth.uid()) or public.has_permission(auth.uid(), 'coach.review'));
create policy "coach_applications: applicant write own draft" on public.coach_applications
  for insert with check (auth.uid() = applicant_id and public.is_active(auth.uid()));
create policy "coach_applications: applicant update own draft" on public.coach_applications
  for update using (auth.uid() = applicant_id and status in ('draft', 'additional_information_required'))
  with check (auth.uid() = applicant_id);
create policy "coach_applications: admin review" on public.coach_applications
  for update using (public.is_admin(auth.uid()) or public.has_permission(auth.uid(), 'coach.review'));

create policy "coach_profiles: public read active" on public.coach_profiles
  for select using (status = 'active' or auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "coach_profiles: owner update" on public.coach_profiles
  for update using (auth.uid() = user_id or public.is_admin(auth.uid()));
-- Coach profiles are created only by approveCoachApplication() (lib/domains/coaching/applications.ts),
-- which runs with the reviewing admin's own session — that admin must therefore have an INSERT
-- grant here, or every approval would fail with RLS silently rejecting the row.
create policy "coach_profiles: admin insert" on public.coach_profiles
  for insert with check (public.is_admin(auth.uid()));

create policy "coach_team_members: coach manages own team" on public.coach_team_members
  for all using (
    exists (select 1 from public.coach_profiles cp where cp.id = coach_profile_id and cp.user_id = auth.uid())
    or public.is_admin(auth.uid())
  );
create policy "coach_team_members: member reads own grants" on public.coach_team_members
  for select using (member_id = auth.uid());
