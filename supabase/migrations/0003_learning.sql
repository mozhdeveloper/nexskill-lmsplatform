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
