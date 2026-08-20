import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { updateUserRoles } from "@/lib/domains/identity/users";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const result = await updateUserRoles(supabase, user.id, params.id, body.roles);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
