import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { ForbiddenError, InvalidStateTransitionError, NotFoundError, hasPermission } from "@/lib/domains/identity/permissions";
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
