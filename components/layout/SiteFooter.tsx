import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-4 py-10 text-center text-sm text-muted sm:grid-cols-3 sm:px-6 sm:text-left">
        <div className="flex items-center justify-center gap-2 font-medium text-foreground sm:justify-start">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-white">
            N
          </span>
          NexSkill
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/" className="transition-colors hover:text-foreground">
            Courses
          </Link>
          <Link href="/become-a-coach" className="transition-colors hover:text-foreground">
            Become a coach
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
        <p className="sm:text-right">&copy; {new Date().getFullYear()} Nexvision Innovations Inc.</p>
      </div>
    </footer>
  );
}
