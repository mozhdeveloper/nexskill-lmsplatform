-- ============================================================
-- 0001_identity.sql
-- ============================================================
-- Nexskill migration 0001: identity, roles, permissions
-- RBAC per docs/roles-permissions.md — roles are NOT a single enum column.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  legal_name text,
  avatar_url text,
  bio text,
  country text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null,
  category text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  effect text not null check (effect in ('grant', 'revoke')),
  created_at timestamptz not null default now(),
  unique (user_id, permission_id)
);

create index idx_user_roles_user on public.user_roles (user_id);
create index idx_user_permissions_user on public.user_permissions (user_id);

-- Auto-create a profile row whenever a new auth.users row is created (§3 identity).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.roles where key = 'student';

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at maintenance, reused by later migrations.
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Permission resolution helper used by RLS policies across every later migration.
-- Mirrors the resolution order in docs/roles-permissions.md:
-- 1) explicit user revoke wins  2) role default  3) explicit user grant.
-- Sub-coach scoped grants (coach_team_members) are resolved by has_course_permission()
-- defined in migration 0002 once that table exists.

-- A suspended account must lose access to protected functionality immediately (§68), not just
-- on next login. has_permission/has_course_permission (used by every coach/admin-gated policy)
-- both fail closed for a suspended user; the student-ownership policies added in later
-- migrations for enrollments/lesson_progress/module_progress/submissions/coach_applications
-- call this directly too.
create function public.is_active(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_user_id and status = 'active');
$$;

create function public.has_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.is_active(p_user_id)
    and not exists (
      select 1 from public.user_permissions up
      join public.permissions p on p.id = up.permission_id
      where up.user_id = p_user_id and p.key = p_permission_key and up.effect = 'revoke'
    )
    and (
      exists (
        select 1 from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where ur.user_id = p_user_id and p.key = p_permission_key
      )
      or exists (
        select 1 from public.user_permissions up
        join public.permissions p on p.id = up.permission_id
        where up.user_id = p_user_id and p.key = p_permission_key and up.effect = 'grant'
      )
    );
$$;

create function public.has_role(p_user_id uuid, p_role_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id and r.key = p_role_key
  );
$$;

create function public.is_admin(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role(p_user_id, 'super_admin');
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permissions enable row level security;

create policy "profiles: self read" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles: self update" on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles: self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Roles/permissions catalogs are readable by any authenticated user (needed to render
-- role-aware UI) but writable only by admins.
create policy "roles: read all authenticated" on public.roles for select using (auth.role() = 'authenticated');
create policy "permissions: read all authenticated" on public.permissions for select using (auth.role() = 'authenticated');
create policy "role_permissions: read all authenticated" on public.role_permissions for select using (auth.role() = 'authenticated');
create policy "roles: admin write" on public.roles for all using (public.is_admin(auth.uid()));
create policy "permissions: admin write" on public.permissions for all using (public.is_admin(auth.uid()));
create policy "role_permissions: admin write" on public.role_permissions for all using (public.is_admin(auth.uid()));

create policy "user_roles: self read" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "user_roles: admin write" on public.user_roles
  for all using (public.is_admin(auth.uid()));

create policy "user_permissions: self read" on public.user_permissions
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "user_permissions: admin write" on public.user_permissions
  for all using (public.is_admin(auth.uid()));


-- ============================================================
-- 0002_coaching.sql
-- ============================================================
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


-- ============================================================
-- 0003_learning.sql
-- ============================================================
-- Nexskill migration 0003: curriculum (courses, modules, lessons, progression rules)

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories (id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  provider text not null default 'supabase_storage',
  provider_asset_id text,
  asset_type text not null check (asset_type in ('image', 'video', 'audio', 'document')),
  title text,
  duration_seconds int,
  thumbnail_url text,
  processing_status text not null default 'ready' check (processing_status in ('pending', 'ready', 'failed')),
  storage_bucket text not null,
  storage_path text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_media_assets_owner on public.media_assets (owner_id);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  coach_profile_id uuid not null references public.coach_profiles (id) on delete cascade,
  title text not null,
  slug text not null unique,
  subtitle text,
  description text,
  category_id uuid references public.categories (id),
  level text not null default 'all_levels' check (level in ('beginner', 'intermediate', 'advanced', 'all_levels')),
  primary_language text not null default 'en',
  course_type text not null default 'mentored'
    check (course_type in ('self_paced', 'mentored', 'live', 'hybrid', 'cohort', 'certification', 'private', 'organization')),
  pricing_model text not null default 'free' check (pricing_model in ('free', 'paid')),
  price_amount_minor int not null default 0,
  price_currency char(3) not null default 'USD',
  access_duration_days int,
  ai_assistant_enabled boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'submitted_for_review', 'under_review', 'approved', 'published', 'rejected', 'unpublished', 'archived')),
  thumbnail_media_id uuid references public.media_assets (id),
  completion_rules jsonb not null default '{"require_all_required_lessons": true, "require_all_required_assignments_passed": true}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at before update on public.courses
  for each row execute procedure public.set_updated_at();

create index idx_courses_coach on public.courses (coach_profile_id);
create index idx_courses_status_category on public.courses (status, category_id);

create table public.course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  version_number int not null,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  unique (course_id, version_number)
);

alter table public.courses
  add column published_version_id uuid references public.course_versions (id);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_course_modules_course on public.course_modules (course_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  position int not null default 0,
  lesson_type text not null check (lesson_type in (
    'video', 'rich_text', 'image_gallery', 'audio', 'pdf', 'file_download', 'presentation',
    'external_resource', 'quiz', 'exam', 'practical_assignment', 'live_class', 'discussion',
    'project', 'checklist', 'survey'
  )),
  content jsonb not null default '{}',
  assignment_id uuid, -- FK added in 0004 after assignments exists
  estimated_minutes int,
  is_required boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_lessons_module on public.lessons (module_id, position);

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  media_id uuid not null references public.media_assets (id),
  label text
);

create table public.progression_rules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  target_type text not null check (target_type in ('module', 'lesson')),
  target_id uuid not null,
  rule_type text not null check (rule_type in (
    'open', 'sequential', 'assignment_gated', 'score_gated', 'instructor_gated', 'date_gated', 'cohort_gated'
  )),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (course_id, target_type, target_id)
);

-- RLS
alter table public.categories enable row level security;
alter table public.media_assets enable row level security;
alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.progression_rules enable row level security;

create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all using (public.is_admin(auth.uid()));

create policy "media_assets: owner or admin read" on public.media_assets
  for select using (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "media_assets: owner insert" on public.media_assets
  for insert with check (owner_id = auth.uid());
create policy "media_assets: owner update" on public.media_assets
  for update using (owner_id = auth.uid() or public.is_admin(auth.uid()));

create policy "courses: public read published" on public.courses
  for select using (
    status = 'published'
    or public.has_course_permission(auth.uid(), id, 'course.edit')
    or public.is_admin(auth.uid())
  );
create policy "courses: coach insert own" on public.courses
  for insert with check (
    public.is_active(auth.uid())
    and exists (select 1 from public.coach_profiles cp where cp.id = coach_profile_id and cp.user_id = auth.uid())
  );
create policy "courses: coach/subcoach/moderator update" on public.courses
  for update using (
    public.has_course_permission(auth.uid(), id, 'course.edit')
    or public.has_course_permission(auth.uid(), id, 'course.publish')
    or public.has_course_permission(auth.uid(), id, 'course.unpublish')
    or public.is_admin(auth.uid())
  );

create policy "course_versions: readable if course readable" on public.course_versions
  for select using (
    exists (select 1 from public.courses c where c.id = course_id)
    and (public.has_course_permission(auth.uid(), course_id, 'course.edit') or public.is_admin(auth.uid())
         or exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'))
  );
create policy "course_versions: coach insert own" on public.course_versions
  for insert with check (public.has_course_permission(auth.uid(), course_id, 'course.publish'));

create policy "course_modules: follow course visibility" on public.course_modules
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    or public.has_course_permission(auth.uid(), course_id, 'course.edit')
    or public.is_admin(auth.uid())
  );
create policy "course_modules: coach/subcoach write" on public.course_modules
  for all using (public.has_course_permission(auth.uid(), course_id, 'course.edit') or public.is_admin(auth.uid()));

create policy "lessons: follow module's course visibility" on public.lessons
  for select using (
    exists (
      select 1 from public.course_modules m join public.courses c on c.id = m.course_id
      where m.id = module_id and (c.status = 'published' or public.has_course_permission(auth.uid(), c.id, 'course.edit'))
    )
    or public.is_admin(auth.uid())
  );
create policy "lessons: coach/subcoach write" on public.lessons
  for all using (
    exists (
      select 1 from public.course_modules m
      where m.id = module_id and public.has_course_permission(auth.uid(), m.course_id, 'course.edit')
    )
    or public.is_admin(auth.uid())
  );

create policy "lesson_resources: follow lesson visibility" on public.lesson_resources
  for select using (
    exists (
      select 1 from public.lessons l join public.course_modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
      where l.id = lesson_id and (c.status = 'published' or public.has_course_permission(auth.uid(), c.id, 'course.edit'))
    )
  );
create policy "lesson_resources: coach write" on public.lesson_resources
  for all using (
    exists (
      select 1 from public.lessons l join public.course_modules m on m.id = l.module_id
      where l.id = lesson_id and public.has_course_permission(auth.uid(), m.course_id, 'course.edit')
    )
  );

create policy "progression_rules: follow course visibility" on public.progression_rules
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    or public.has_course_permission(auth.uid(), course_id, 'course.edit')
    or public.is_admin(auth.uid())
  );
create policy "progression_rules: coach write" on public.progression_rules
  for all using (public.has_course_permission(auth.uid(), course_id, 'course.edit') or public.is_admin(auth.uid()));


-- ============================================================
-- 0004_assessment.sql
-- ============================================================
-- Nexskill migration 0004: assignments, rubrics, submissions, reviews

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id),
  title text not null,
  instructions text not null,
  demonstration_media_ids uuid[] not null default '{}',
  reference_file_media_ids uuid[] not null default '{}',
  required_submission_types text[] not null default '{text}',
  max_attempts int,
  due_at timestamptz,
  passing_criteria jsonb not null default '{"type": "pass_fail"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.assignments
  for each row execute procedure public.set_updated_at();

alter table public.lessons
  add constraint lessons_assignment_id_fkey foreign key (assignment_id) references public.assignments (id);

create table public.rubric_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  label text not null,
  max_points int not null,
  position int not null default 0
);

-- Enrollment/progress tables are defined here (not 0003) because submissions reference enrollments
-- and progress tables reference both — kept together to avoid forward-reference churn.
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  course_version_id uuid references public.course_versions (id),
  cohort_id uuid, -- reserved for P1 cohorts table
  enrollment_source text not null check (enrollment_source in (
    'purchase', 'free', 'admin_grant', 'organization', 'coupon', 'scholarship', 'invitation'
  )),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'suspended', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index uq_enrollments_active_student_course
  on public.enrollments (student_id, course_id)
  where status <> 'cancelled';

create index idx_enrollments_student on public.enrollments (student_id, status);
create index idx_enrollments_course on public.enrollments (course_id, status);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  unique (enrollment_id, lesson_id)
);

create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  status text not null default 'locked' check (status in ('locked', 'unlocked', 'completed')),
  unlocked_at timestamptz,
  completed_at timestamptz,
  unique (enrollment_id, module_id)
);

create table public.course_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  percent numeric(5, 2) not null default 0,
  completion_rule_snapshot jsonb not null,
  completed_at timestamptz
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'revision_required', 'passed', 'failed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, enrollment_id, attempt_number)
);

create trigger set_updated_at before update on public.submissions
  for each row execute procedure public.set_updated_at();

create index idx_submissions_assignment_status on public.submissions (assignment_id, status);
create index idx_submissions_enrollment on public.submissions (enrollment_id);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  media_id uuid not null references public.media_assets (id),
  submission_type text not null check (submission_type in ('photo', 'video', 'pdf', 'document', 'text', 'audio'))
);

create table public.submission_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id),
  decision text not null check (decision in ('revision_required', 'passed', 'failed')),
  written_feedback text,
  rubric_scores jsonb not null default '{}',
  reviewed_at timestamptz not null default now()
);

-- RLS
alter table public.assignments enable row level security;
alter table public.rubric_items enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.module_progress enable row level security;
alter table public.course_progress enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;
alter table public.submission_reviews enable row level security;

create policy "assignments: follow course visibility" on public.assignments
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    or public.has_course_permission(auth.uid(), course_id, 'course.edit')
    or public.is_admin(auth.uid())
  );
create policy "assignments: coach write" on public.assignments
  for all using (public.has_course_permission(auth.uid(), course_id, 'course.edit') or public.is_admin(auth.uid()));

create policy "rubric_items: follow assignment" on public.rubric_items
  for select using (exists (select 1 from public.assignments a where a.id = assignment_id));
create policy "rubric_items: coach write" on public.rubric_items
  for all using (
    exists (select 1 from public.assignments a where a.id = assignment_id and public.has_course_permission(auth.uid(), a.course_id, 'course.edit'))
  );

create policy "enrollments: student reads own" on public.enrollments
  for select using (
    (student_id = auth.uid() and public.is_active(auth.uid()))
    or public.has_course_permission(auth.uid(), course_id, 'submission.review')
    or public.is_admin(auth.uid())
  );
create policy "enrollments: student self-enroll" on public.enrollments
  for insert with check ((student_id = auth.uid() and public.is_active(auth.uid())) or public.is_admin(auth.uid()));
create policy "enrollments: student/admin update" on public.enrollments
  for update using ((student_id = auth.uid() and public.is_active(auth.uid())) or public.is_admin(auth.uid()));

create policy "lesson_progress: owner via enrollment" on public.lesson_progress
  for select using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and ((e.student_id = auth.uid() and public.is_active(auth.uid())) or public.has_course_permission(auth.uid(), e.course_id, 'submission.review')))
    or public.is_admin(auth.uid())
  );
create policy "lesson_progress: owner write" on public.lesson_progress
  for all using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "module_progress: owner via enrollment" on public.module_progress
  for select using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and (e.student_id = auth.uid() or public.has_course_permission(auth.uid(), e.course_id, 'submission.review')))
    or public.is_admin(auth.uid())
  );
create policy "module_progress: system write" on public.module_progress
  for all using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "course_progress: owner via enrollment" on public.course_progress
  for select using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and ((e.student_id = auth.uid() and public.is_active(auth.uid())) or public.has_course_permission(auth.uid(), e.course_id, 'submission.review')))
    or public.is_admin(auth.uid())
  );
create policy "course_progress: system write" on public.course_progress
  for all using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "submissions: student owns" on public.submissions
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.has_course_permission(auth.uid(), a.course_id, 'submission.review'))
    or public.is_admin(auth.uid())
  );
create policy "submissions: student write own" on public.submissions
  for insert with check (student_id = auth.uid() and public.is_active(auth.uid()));
create policy "submissions: student updates own draft, reviewer updates status" on public.submissions
  for update using (
    (student_id = auth.uid() and public.is_active(auth.uid()))
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.has_course_permission(auth.uid(), a.course_id, 'submission.review'))
    or public.is_admin(auth.uid())
  );

create policy "submission_files: follow submission" on public.submission_files
  for select using (
    exists (
      select 1 from public.submissions s where s.id = submission_id
      and (s.student_id = auth.uid()
           or exists (select 1 from public.assignments a where a.id = s.assignment_id and public.has_course_permission(auth.uid(), a.course_id, 'submission.review')))
    )
    or public.is_admin(auth.uid())
  );
create policy "submission_files: student attaches to own" on public.submission_files
  for insert with check (exists (select 1 from public.submissions s where s.id = submission_id and s.student_id = auth.uid()));

create policy "submission_reviews: visible to student + reviewers" on public.submission_reviews
  for select using (
    exists (select 1 from public.submissions s where s.id = submission_id and s.student_id = auth.uid())
    or exists (
      select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
      where s.id = submission_id and public.has_course_permission(auth.uid(), a.course_id, 'submission.review')
    )
    or public.is_admin(auth.uid())
  );
create policy "submission_reviews: reviewer inserts" on public.submission_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
      where s.id = submission_id and public.has_course_permission(auth.uid(), a.course_id, 'submission.review')
    )
  );


-- ============================================================
-- 0005_certification.sql
-- ============================================================
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


-- ============================================================
-- 0006_system.sql
-- ============================================================
-- Nexskill migration 0006: audit log, platform settings, background jobs

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  previous_state jsonb,
  new_state jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_target on public.audit_logs (target_type, target_id);
create index idx_audit_logs_actor on public.audit_logs (actor_id);

create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  category text not null,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.platform_settings
  for each row execute procedure public.set_updated_at();

create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

create index idx_background_jobs_due on public.background_jobs (status, run_after);

-- Audit log is append-only: no update/delete policy for anyone, including admins (§49).
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.background_jobs enable row level security;

create policy "audit_logs: admin read" on public.audit_logs for select using (public.is_admin(auth.uid()));
create policy "audit_logs: system insert" on public.audit_logs for insert with check (true);

create policy "platform_settings: admin read non-secret or admin" on public.platform_settings
  for select using (is_secret = false or public.is_admin(auth.uid()));
create policy "platform_settings: admin write" on public.platform_settings
  for all using (public.is_admin(auth.uid()));

create policy "background_jobs: admin read" on public.background_jobs for select using (public.is_admin(auth.uid()));
create policy "background_jobs: system write" on public.background_jobs for all using (public.is_admin(auth.uid()));

-- ============================================================
-- Seed: roles, permissions, role_permissions, default settings
-- ============================================================

insert into public.roles (key, label) values
  ('guest', 'Guest'),
  ('student', 'Student'),
  ('coach', 'Coach'),
  ('sub_coach', 'Sub-Coach'),
  ('org_owner', 'Organization Owner'),
  ('org_admin', 'Organization Admin'),
  ('support', 'Support'),
  ('finance_admin', 'Finance Admin'),
  ('content_moderator', 'Content Moderator'),
  ('super_admin', 'Super Admin');

insert into public.permissions (key, description, category) values
  ('coach.review', 'Review and approve/reject coach applications', 'coaching'),
  ('course.edit', 'Create/edit a course''s curriculum', 'learning'),
  ('course.publish', 'Publish a course', 'learning'),
  ('course.unpublish', 'Unpublish/moderate any course', 'learning'),
  ('course.set_price', 'Set or change a course''s price', 'commerce'),
  ('submission.review', 'View and comment on assignment submissions', 'assessment'),
  ('submission.pass', 'Pass/fail/request revision on a submission', 'assessment'),
  ('team.manage', 'Appoint and configure sub-coaches', 'coaching'),
  ('analytics.view', 'View course/coach analytics', 'analytics'),
  ('payout.view', 'View instructor payout/earnings data', 'commerce'),
  ('payout.request', 'Request an instructor payout', 'commerce'),
  ('user.suspend', 'Suspend or reinstate a user account', 'admin'),
  ('certificate.revoke', 'Revoke an issued certificate', 'certification'),
  ('settings.manage', 'Change platform settings', 'admin'),
  ('account.delete', 'Delete a coach account', 'admin');

-- Coach: owns and edits their own courses/submissions (ownership itself is checked via
-- has_course_permission's owner-id comparison, not by this table).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'coach' and p.key in (
  'course.edit', 'course.publish', 'submission.review', 'submission.pass',
  'team.manage', 'analytics.view', 'payout.view', 'payout.request', 'course.set_price'
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'super_admin';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'content_moderator' and p.key in ('course.unpublish');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'finance_admin' and p.key in ('payout.view', 'payout.request', 'settings.manage');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'support' and p.key in ('user.suspend');

-- coach.review is granted to super_admin only by default (already covered above); content
-- moderators/support may be individually granted it later via user_permissions.

insert into public.platform_settings (key, value, category, is_secret) values
  ('default_commission_rate', '0.15', 'commerce', false),
  ('default_access_duration_days', 'null', 'courses', false),
  ('coach_approval_required', 'true', 'coaches', false),
  ('course_publish_requires_admin_review', 'false', 'courses', false);


-- ============================================================
-- 0007_storage.sql
-- ============================================================
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


