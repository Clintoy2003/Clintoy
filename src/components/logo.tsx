export function ClintoyMark({ className = "h-8 w-8", tone = "ink" }: { className?: string; tone?: "ink" | "plain" }) {
  const background = tone === "ink" ? "var(--ink)" : "transparent";
  const foreground = tone === "ink" ? "#ffffff" : "currentColor";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill={background} />
      <circle cx="20" cy="20" r="8.5" fill="none" stroke={foreground} strokeWidth="2.3" />
      <circle cx="20" cy="20" r="2.6" fill={foreground} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <ClintoyMark className="h-8 w-8 shrink-0" />
      <span className="text-[1.2rem] font-semibold tracking-tight text-ink">Clintoy</span>
    </span>
  );
}
