import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/domains/identity/permissions";
import { SignOutButton } from "@/components/layout/SignOutButton";

/**
 * Shared chrome for the authenticated app sections (/learn, /coach, /admin). Server-rendered —
 * the mobile menu uses a native <details>/<summary> disclosure so no client JS is needed just
 * to open/close it.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isCoach = false;
  let admin = false;
  if (user) {
    const [{ data: coachProfile }, adminCheck] = await Promise.all([
      supabase.from("coach_profiles").select("id").eq("user_id", user.id).maybeSingle(),
      isAdmin(supabase, user.id),
    ]);
    isCoach = Boolean(coachProfile);
    admin = adminCheck;
  }

  const links = [
    { href: "/learn", label: "My Learning" },
    ...(isCoach ? [{ href: "/coach", label: "Coach Studio" }] : []),
    ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                N
              </span>
              NexSkill
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden md:block">
            <SignOutButton />
          </div>

          <details className="relative md:hidden">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-foreground [&::-webkit-details-marker]:hidden">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            </summary>
            <div className="absolute right-0 top-11 w-52 animate-scale-in rounded-lg border border-border bg-surface p-2 shadow-soft-lg">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-raised">
                  {link.label}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              <div className="px-1 py-1">
                <SignOutButton />
              </div>
            </div>
          </details>
        </div>
      </header>
      <main className="animate-fade-in">{children}</main>
    </div>
  );
}
