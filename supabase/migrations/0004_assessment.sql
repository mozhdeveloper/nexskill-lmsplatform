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
