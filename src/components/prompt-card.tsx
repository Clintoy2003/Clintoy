"use client";

import Link from "next/link";
import { useState } from "react";

export type PromptCardData = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  tags: string;
  uses: number;
};

export function PromptCard({ prompt, compact = false }: { prompt: PromptCardData; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [uses, setUses] = useState(prompt.uses);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt.body);
      setCopied(true);
      setUses((value) => value + 1);
      setTimeout(() => setCopied(false), 1800);
      void fetch(`/api/prompts/${prompt.id}/use`, { method: "POST" }).catch(() => undefined);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="card-paper group flex h-full flex-col rounded-2xl p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
          {prompt.category}
        </span>
        <span className="text-[0.65rem] text-muted">{uses.toLocaleString("en-US")} uses</span>
      </div>
      <h3 className={`mt-3 font-semibold ${compact ? "text-lg" : "text-xl"} leading-tight text-ink`}>{prompt.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{prompt.summary}</p>
      <pre className="mt-3 max-h-28 overflow-hidden whitespace-pre-wrap rounded-lg border border-line bg-paper px-3 py-2 font-sans text-[0.74rem] leading-relaxed text-ink-soft">
        {prompt.body.length > 220 ? `${prompt.body.slice(0, 217)}…` : prompt.body}
      </pre>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          href={`/chat?prompt=${encodeURIComponent(prompt.body)}`}
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-accent"
        >
          Use in Clintoy
        </Link>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-ink hover:text-ink"
        >
          {copied ? "Copied ✓" : "Copy prompt"}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {copied ? `${prompt.title} copied to clipboard` : ""}
        </span>
      </div>
    </article>
  );
}
