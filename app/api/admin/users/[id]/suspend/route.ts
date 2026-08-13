import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { suspendUser, reinstateUser } from "@/lib/domains/identity/users";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const body = await request.json().catch(() => ({ action: "suspend" }));
    const result =
      body.action === "reinstate"
        ? await reinstateUser(supabase, user.id, params.id)
        : await suspendUser(supabase, user.id, params.id);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
