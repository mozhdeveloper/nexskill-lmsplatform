-- Nexskill migration 0008: fix "new row violates row-level security policy for table courses"
-- on course creation.
--
-- `INSERT ... RETURNING` (used by createCourse via `.insert(...).select().single()`) also
-- enforces the table's SELECT policy against the freshly inserted row. The existing
-- "courses: public read published" policy leans on has_course_permission(), which is STABLE
-- and internally re-queries `courses` by id to resolve ownership. STABLE functions run against
-- the snapshot taken at the start of the statement, and within the very same INSERT statement
-- that snapshot predates the new row — so the self-join finds nothing, has_course_permission()
-- returns false, and the RETURNING check fails with a spurious RLS violation even though the
-- INSERT's own WITH CHECK clause is satisfied.
--
-- Fix: add a permissive SELECT policy that lets a coach see courses linked to their own
-- coach_profile_id directly off the row being checked, without re-querying `courses`. This
-- mirrors "courses: coach insert own"'s WITH CHECK subquery exactly, sidesteps the
-- self-reference entirely, and is additive (OR'd with the existing policy) so it only
-- broadens visibility — coaches can now also see their own draft/unpublished courses.
create policy "courses: coach select own" on public.courses
  for select using (
    exists (select 1 from public.coach_profiles cp where cp.id = coach_profile_id and cp.user_id = auth.uid())
  );
