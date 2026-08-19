import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * The type actually returned by createServerClient<Database>() from @supabase/ssr, which
 * resolves its generics differently than a bare `SupabaseClient<Database>` annotation from
 * @supabase/supabase-js — using the latter in domain function signatures fails `next build`'s
 * strict type-check (dev mode's looser checking doesn't catch it) even though the values are
 * the same shape at runtime. Domain modules should type their `supabase` parameter as this,
 * not `SupabaseClient<Database>`.
 */
export type TypedSupabaseClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Use in Server Components, Route Handlers, and Server Actions.
 * Respects RLS as the authenticated user — this is the client every
 * domain module should use, NOT the service-role client below.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render; middleware refreshes the session instead.
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See above.
          }
        },
      },
    }
  );
}

/**
 * Service-role client that bypasses RLS entirely. Server-only, never imported
 * from client components. Reserved for: the seed script, and background jobs
 * (e.g. certificate anchoring) that must act outside a user session.
 * Every call site using this client must perform its own authorization check
 * in application code, since the database will not do it.
 */
export function createSupabaseServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseServiceRoleClient must never be called from the browser.");
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
    }
  );
}
