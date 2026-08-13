import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { passSubmission } from "@/lib/domains/assessment/submissions";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const submission = await passSubmission(supabase, user.id, params.id, body);
    return NextResponse.json(submission);
  } catch (err) {
    return toErrorResponse(err);
  }
}
