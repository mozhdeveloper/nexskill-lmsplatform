import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { ForbiddenError, hasPermission } from "@/lib/domains/identity/permissions";
import { writeAuditLog } from "@/lib/domains/system/audit";

export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    if (!(await hasPermission(supabase, user.id, "settings.manage"))) {
      throw new ForbiddenError("You cannot change platform settings.");
    }
    const body = await request.json();
    const { data: previous } = await supabase.from("platform_settings").select("value").eq("key", params.key).maybeSingle();

    const { data, error } = await supabase.from("platform_settings").update({ value: body.value }).eq("key", params.key).select().single();
    if (error) throw error;

    await writeAuditLog(supabase, {
      actorId: user.id,
      action: "platform_settings.updated",
      targetType: "platform_settings",
      targetId: data.id,
      previousState: previous?.value,
      newState: body.value,
    });

    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
