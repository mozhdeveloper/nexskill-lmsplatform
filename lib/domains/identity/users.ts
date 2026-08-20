import { z } from "zod";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { ForbiddenError, InvalidStateTransitionError, NotFoundError, ValidationError, hasPermission, isAdmin } from "@/lib/domains/identity/permissions";
import { writeAuditLog } from "@/lib/domains/system/audit";

/** Admin/support suspends a user account (§7, §68: suspended user must lose access immediately). */
export async function suspendUser(supabase: TypedSupabaseClient, actorId: string, targetUserId: string) {
  if (!(await hasPermission(supabase, actorId, "user.suspend"))) {
    throw new ForbiddenError("You cannot suspend user accounts.");
  }
  const { data: profile, error } = await supabase.from("profiles").select("id, status").eq("id", targetUserId).single();
  if (error || !profile) throw new NotFoundError("User not found.");
  if (profile.status === "suspended") throw new InvalidStateTransitionError("User is already suspended.");

  const { data, error: updateError } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", targetUserId).select().single();
  if (updateError) throw updateError;

  await writeAuditLog(supabase, {
    actorId,
    action: "user.suspended",
    targetType: "profiles",
    targetId: targetUserId,
    previousState: { status: "active" },
    newState: { status: "suspended" },
  });
  return data;
}

export async function reinstateUser(supabase: TypedSupabaseClient, actorId: string, targetUserId: string) {
  if (!(await hasPermission(supabase, actorId, "user.suspend"))) {
    throw new ForbiddenError("You cannot reinstate user accounts.");
  }
  const { data: profile, error } = await supabase.from("profiles").select("id, status").eq("id", targetUserId).single();
  if (error || !profile) throw new NotFoundError("User not found.");
  if (profile.status === "active") throw new InvalidStateTransitionError("User is already active.");

  const { data, error: updateError } = await supabase.from("profiles").update({ status: "active" }).eq("id", targetUserId).select().single();
  if (updateError) throw updateError;

  await writeAuditLog(supabase, {
    actorId,
    action: "user.reinstated",
    targetType: "profiles",
    targetId: targetUserId,
    previousState: { status: "suspended" },
    newState: { status: "active" },
  });
  return data;
}

// Org roles are intentionally excluded here — org accounts are created through the (not yet
// built, P2) organization onboarding flow, not this general-purpose admin form.
export const ASSIGNABLE_ROLES = [
  "student",
  "coach",
  "sub_coach",
  "support",
  "finance_admin",
  "content_moderator",
  "super_admin",
] as const;

const createUserAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120),
  roles: z.array(z.enum(ASSIGNABLE_ROLES)).min(1),
});

/**
 * Admin creates a user account directly (email + password, pre-confirmed) with an explicit
 * role set — the only way to mint a coach/support/finance_admin/super_admin account without
 * going through self-registration + the coach-application approval flow, or the one-off seed
 * script. Deliberately admin-only (isAdmin, not the granular permission system): minting
 * accounts with arbitrary roles — including super_admin — is sensitive enough that it isn't
 * worth exposing to the finer-grained permission model yet.
 */
export async function createUserAccount(
  supabase: TypedSupabaseClient,
  actorId: string,
  input: z.infer<typeof createUserAccountSchema>
) {
  if (!(await isAdmin(supabase, actorId))) {
    throw new ForbiddenError("Only an administrator can create user accounts.");
  }

  const parsed = createUserAccountSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));

  const service = createSupabaseServiceRoleClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName },
  });
  if (createError || !created.user) {
    throw new ValidationError(createError?.message ?? "Could not create the account.");
  }

  // The handle_new_user trigger already created a profiles row and defaulted the account to
  // 'student'. Replace that default with exactly the roles requested here.
  const { data: roleRows } = await service.from("roles").select("id, key").in("key", parsed.data.roles);
  const roleIds = (roleRows ?? []).map((r) => r.id);

  await service.from("user_roles").delete().eq("user_id", created.user.id);
  if (roleIds.length > 0) {
    await service.from("user_roles").insert(roleIds.map((role_id) => ({ user_id: created.user.id, role_id })));
  }

  await writeAuditLog(supabase, {
    actorId,
    action: "user.created_by_admin",
    targetType: "profiles",
    targetId: created.user.id,
    newState: { email: parsed.data.email, roles: parsed.data.roles },
  });

  return { id: created.user.id, email: parsed.data.email, displayName: parsed.data.displayName, roles: parsed.data.roles };
}

const updateUserRolesSchema = z.array(z.enum(ASSIGNABLE_ROLES)).min(1);

/** Admin replaces a user's full role set. Same admin-only gate as account creation. */
export async function updateUserRoles(supabase: TypedSupabaseClient, actorId: string, targetUserId: string, roles: string[]) {
  if (!(await isAdmin(supabase, actorId))) {
    throw new ForbiddenError("Only an administrator can change user roles.");
  }

  const parsed = updateUserRolesSchema.safeParse(roles);
  if (!parsed.success) throw new ValidationError("At least one valid role is required.");

  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service.from("profiles").select("id").eq("id", targetUserId).maybeSingle();
  if (!profile) throw new NotFoundError("User not found.");

  const { data: previousRoleRows } = await service
    .from("user_roles")
    .select("roles(key)")
    .eq("user_id", targetUserId)
    .returns<Array<{ roles: { key: string } | null }>>();
  const previousRoles = (previousRoleRows ?? []).map((r) => r.roles?.key).filter(Boolean);

  const { data: roleRows } = await service.from("roles").select("id, key").in("key", parsed.data);
  const roleIds = (roleRows ?? []).map((r) => r.id);

  await service.from("user_roles").delete().eq("user_id", targetUserId);
  if (roleIds.length > 0) {
    await service.from("user_roles").insert(roleIds.map((role_id) => ({ user_id: targetUserId, role_id })));
  }

  await writeAuditLog(supabase, {
    actorId,
    action: "user.roles_updated",
    targetType: "profiles",
    targetId: targetUserId,
    previousState: { roles: previousRoles },
    newState: { roles: parsed.data },
  });

  return { id: targetUserId, roles: parsed.data };
}
