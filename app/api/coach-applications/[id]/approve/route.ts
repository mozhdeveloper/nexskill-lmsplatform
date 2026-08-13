import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { approveCoachApplication } from "@/lib/domains/coaching/applications";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requireAuthResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const coachProfile = await approveCoachApplication(supabase, user.id, params.id, body.reviewNotes);
    return NextResponse.json(coachProfile);
  } catch (err) {
    return toErrorResponse(err);
  }
}
