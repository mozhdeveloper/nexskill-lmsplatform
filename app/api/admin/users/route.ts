import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { createUserAccount } from "@/lib/domains/identity/users";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const account = await createUserAccount(supabase, user.id, body);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
