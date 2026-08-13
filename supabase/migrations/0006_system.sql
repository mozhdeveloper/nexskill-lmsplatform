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
