import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { enrollStudent } from "@/lib/domains/enrollment/enroll";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const enrollment = await enrollStudent(supabase, user.id, params.id);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
