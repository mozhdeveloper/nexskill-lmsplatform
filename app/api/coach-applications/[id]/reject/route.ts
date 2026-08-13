import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { rejectCoachApplication } from "@/lib/domains/coaching/applications";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const body = await request.json();
    const application = await rejectCoachApplication(supabase, user.id, params.id, body.reviewNotes);
    return NextResponse.json(application);
  } catch (err) {
    return toErrorResponse(err);
  }
}
