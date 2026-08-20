import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { ValidationError } from "@/lib/domains/identity/permissions";
import { reorderModule } from "@/lib/domains/learning/courses";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    if (body.direction !== "up" && body.direction !== "down") {
      throw new ValidationError('direction must be "up" or "down".');
    }
    const result = await reorderModule(supabase, user.id, params.id, body.direction);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
