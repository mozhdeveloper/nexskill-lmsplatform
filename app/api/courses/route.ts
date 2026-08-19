import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { createCourse } from "@/lib/domains/learning/courses";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const course = await createCourse(supabase, user.id, body);
    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
