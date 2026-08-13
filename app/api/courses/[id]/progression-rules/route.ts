import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { setProgressionRule } from "@/lib/domains/learning/courses";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const body = await request.json();
    const rule = await setProgressionRule(supabase, user.id, params.id, body);
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
