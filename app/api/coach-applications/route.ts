import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { submitCoachApplication } from "@/lib/domains/coaching/applications";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    const body = await request.json();
    const application = await submitCoachApplication(supabase, user.id, body);
    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
