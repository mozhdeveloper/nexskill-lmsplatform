import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { createAssignment } from "@/lib/domains/assessment/assignments";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const assignment = await createAssignment(supabase, user.id, params.id, body);
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
