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
