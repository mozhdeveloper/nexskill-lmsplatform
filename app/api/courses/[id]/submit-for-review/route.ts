import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { submitCourseForReview } from "@/lib/domains/learning/courses";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const course = await submitCourseForReview(supabase, user.id, params.id);
    return NextResponse.json(course);
  } catch (err) {
    return toErrorResponse(err);
  }
}
