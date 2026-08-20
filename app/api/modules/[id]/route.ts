import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { updateModule, deleteModule } from "@/lib/domains/learning/courses";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const courseModule = await updateModule(supabase, user.id, params.id, body);
    return NextResponse.json(courseModule);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const result = await deleteModule(supabase, user.id, params.id);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
