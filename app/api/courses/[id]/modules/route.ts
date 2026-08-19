import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { addModule } from "@/lib/domains/learning/courses";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const courseModule = await addModule(supabase, user.id, params.id, body);
    return NextResponse.json(courseModule, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
