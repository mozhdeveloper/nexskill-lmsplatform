import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { failSubmission } from "@/lib/domains/assessment/submissions";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const submission = await failSubmission(supabase, user.id, params.id, body);
    return NextResponse.json(submission);
  } catch (err) {
    return toErrorResponse(err);
  }
}
