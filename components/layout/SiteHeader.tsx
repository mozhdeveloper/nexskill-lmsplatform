"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Courses" },
  { href: "/become-a-coach", label: "Become a coach" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 border-b transition-all duration-300 ease-soft",
        scrolled ? "border-border bg-surface/80 shadow-soft backdrop-blur-md" : "border-transparent bg-transparent"
      )}
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-soft">
            N
          </span>
          NexSkill
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-muted md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <>
              <Link href="/learn" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
                My Learning
              </Link>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground md:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <div className="flex h-4 w-5 flex-col justify-between">
            <span
              className={clsx(
                "h-0.5 w-full rounded bg-current transition-transform duration-300 ease-soft",
                menuOpen && "translate-y-[7px] rotate-45"
              )}
            />
            <span className={clsx("h-0.5 w-full rounded bg-current transition-opacity duration-200", menuOpen && "opacity-0")} />
            <span
              className={clsx(
                "h-0.5 w-full rounded bg-current transition-transform duration-300 ease-soft",
                menuOpen && "-translate-y-[7px] -rotate-45"
              )}
            />
          </div>
        </button>
      </div>

      <div
        className={clsx(
          "overflow-hidden border-t border-border bg-surface transition-[max-height,opacity] duration-300 ease-soft md:hidden",
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-surface-raised">
              {link.label}
            </Link>
          ))}
          <div className="my-2 border-t border-border" />
          {signedIn ? (
            <>
              <Link href="/learn" className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-surface-raised">
                My Learning
              </Link>
              <button onClick={handleSignOut} className="rounded-md px-2 py-2.5 text-left text-sm font-medium hover:bg-surface-raised">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-surface-raised">
                Sign in
              </Link>
              <Link href="/register" className="rounded-md px-2 py-2.5 text-sm font-medium text-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
