import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Thin TypeScript mirror of the SQL permission functions defined in
 * supabase/migrations/0001_identity.sql and 0002_coaching.sql.
 *
 * This is a defense-in-depth layer: RLS is the authoritative enforcement (the database
 * will reject the write even if this check is skipped), but calling it explicitly from
 * domain functions lets us return a clean 403 with a stable error code instead of a
 * confusing "0 rows updated" from a silently-filtered RLS write.
 */

export async function getCurrentProfileId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function hasPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", {
    p_user_id: userId,
    p_permission_key: permissionKey,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function hasCoursePermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseId: string,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_course_permission", {
    p_user_id: userId,
    p_course_id: courseId,
    p_permission_key: permissionKey,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function isAdmin(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin", { p_user_id: userId });
  if (error) throw error;
  return Boolean(data);
}

export class ForbiddenError extends Error {
  code = "FORBIDDEN" as const;
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

export class NotFoundError extends Error {
  code = "NOT_FOUND" as const;
  constructor(message = "The requested resource was not found.") {
    super(message);
  }
}

export class InvalidStateTransitionError extends Error {
  code = "INVALID_STATE_TRANSITION" as const;
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends Error {
  code = "VALIDATION_FAILED" as const;
  constructor(message: string) {
    super(message);
  }
}
