const points = [
  "Structured modules that unlock as you progress",
  "Real practical assignments, reviewed by your coach",
  "A verifiable certificate when you're done",
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-accent px-10 py-12 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
      <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold backdrop-blur">N</span>
        NexSkill
      </div>

      <div className="relative">
        <h2 className="text-3xl font-semibold leading-tight">Learn a skill. Prove it. Build your future.</h2>
        <ul className="mt-8 space-y-4">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-white/90">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/60">A global skills marketplace &amp; learning platform.</p>
    </div>
  );
}
