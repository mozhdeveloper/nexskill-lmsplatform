import type { TypedSupabaseClient } from "@/lib/supabase/server";

/** Append-only audit log write (§49). Never throws the caller's transaction off course. */
export async function writeAuditLog(
  supabase: TypedSupabaseClient,
  entry: {
    actorId: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    previousState?: unknown;
    newState?: unknown;
  }
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    previous_state: entry.previousState ?? null,
    new_state: entry.newState ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("audit_log write failed", entry.action, error);
  }
}
