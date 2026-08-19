import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles the redirect Supabase Auth sends the browser to after a user clicks an email
 * confirmation / magic link. Supabase's PKCE flow puts a one-time `code` in the query string;
 * this exchanges it for a real session (setting the auth cookies) before sending the user on.
 * Without this route, `emailRedirectTo` would land the user on a page with no session at all —
 * they'd have to log in again separately.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/learn";

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
