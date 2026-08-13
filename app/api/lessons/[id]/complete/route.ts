import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { completeLesson } from "@/lib/domains/enrollment/enroll";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const result = await completeLesson(supabase, user.id, params.id);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
