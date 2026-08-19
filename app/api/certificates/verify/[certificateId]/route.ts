import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/api-error";
import { getPublicCertificate } from "@/lib/domains/certification/certificates";

// Deliberately unauthenticated — public certificate verification must work signed-out (§104).
export async function GET(_request: NextRequest, { params }: { params: { certificateId: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const certificate = await getPublicCertificate(supabase, params.certificateId);
    if (!certificate) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "No certificate found with that ID." } }, { status: 404 });
    }
    return NextResponse.json(certificate);
  } catch (err) {
    return toErrorResponse(err);
  }
}
