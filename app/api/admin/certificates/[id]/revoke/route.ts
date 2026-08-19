import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse, requireAuthResponse } from "@/lib/api-error";
import { ForbiddenError, isAdmin } from "@/lib/domains/identity/permissions";
import { revokeCertificate } from "@/lib/domains/certification/certificates";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return requireAuthResponse();

    if (!(await isAdmin(supabase, user.id))) {
      throw new ForbiddenError("Only an administrator can revoke a certificate.");
    }
    const body = await request.json();
    const certificate = await revokeCertificate(supabase, user.id, params.id, body.reason);
    return NextResponse.json(certificate);
  } catch (err) {
    return toErrorResponse(err);
  }
}
