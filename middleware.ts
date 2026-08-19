import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every request so Server Components
// always see a valid session without each page re-implementing this.
//
// This must never take the whole site down: refreshing the session here is a
// proactive nicety, not a requirement — every protected page already calls
// supabase.auth.getUser() itself and redirects if there's no session. If
// anything here throws (missing/misconfigured env vars, a transient Supabase
// outage, an Edge Runtime incompatibility), fail open and let the request
// through; the worst case is a page-level redirect to /login instead of a
// refreshed cookie, not a MIDDLEWARE_INVOCATION_FAILED 500 on every route.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      // eslint-disable-next-line no-console
      console.error("middleware: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });

    await supabase.auth.getUser();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("middleware: session refresh failed, letting the request through unauthenticated", error);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
