"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";

const SAMPLES = [
  { label: "Explain it", prompt: "Explain compound interest to a beginner" },
  { label: "Do the maths", prompt: "What is 18% of 245?" },
  { label: "Write it", prompt: "Write an email to my team about moving our standup to 9:30" },
  { label: "Plan it", prompt: "Plan four weeks to learn the basics of statistics" },
];

type State = "idle" | "loading" | "ready" | "error";

export function HeroDemo() {
  const [prompt, setPrompt] = useState(SAMPLES[0]);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<State>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const cache = useRef(new Map<string, { content: string; suggestions: string[] }>());

  useEffect(() => {
    const current = prompt.prompt;
    const cached = cache.current.get(current);
    if (cached) {
      setAnswer(cached.content);
      setSuggestions(cached.suggestions);
      setState("ready");
      return;
    }
    let cancelled = false;
    setState("loading");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: current, mode: "balanced" }),
        });
        const data = (await response.json()) as { content?: string; suggestions?: string[] };
        if (cancelled) return;
        if (data.content) {
          cache.current.set(current, { content: data.content, suggestions: data.suggestions ?? [] });
          setAnswer(data.content);
          setSuggestions(data.suggestions ?? []);
          setState("ready");
        } else {
          setState("error");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prompt]);

  return (
    <div className="card-paper relative overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-line-strong" />
            <span className="h-2 w-2 rounded-full bg-line-strong" />
            <span className="h-2 w-2 rounded-full bg-line-strong" />
          </span>
          <span className="ml-1 text-xs font-medium text-ink-soft">Clintoy</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          engine live
        </span>
      </div>

      <div className="px-4 pt-4">
        <div role="tablist" aria-label="Example requests" className="flex flex-wrap gap-1.5">
          {SAMPLES.map((sample) => {
            const active = sample.prompt === prompt.prompt;
            return (
              <button
                key={sample.label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPrompt(sample)}
                className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition ${
                  active ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {sample.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-[0.82rem] leading-snug text-paper">
          {prompt.prompt}
        </div>

        <div className="mt-3 min-h-[15rem] rounded-2xl rounded-bl-md border border-line bg-paper-soft px-3.5 py-3">
          {state === "loading" || state === "idle" ? (
            <div className="flex items-center gap-1.5 py-6 pl-1" aria-live="polite" aria-label="Clintoy is thinking">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent"
                  style={{ animationDelay: `${dot * 0.15}s` }}
                />
              ))}
              <span className="ml-2 text-xs text-muted">thinking it through…</span>
            </div>
          ) : state === "error" ? (
            <p className="py-4 text-sm text-muted">The demo could not load. Open Clintoy — it works there.</p>
          ) : (
            <div className="rise max-h-[17rem] overflow-y-auto no-scrollbar pr-1">
              <Markdown content={answer} />
            </div>
          )}
        </div>

        {state === "ready" && suggestions.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 2).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setPrompt({ label: suggestion, prompt: suggestion })}
                className="rounded-full border border-dashed border-line px-2.5 py-1 text-[0.68rem] text-muted transition hover:border-accent hover:text-accent"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <Link
            href={`/chat?prompt=${encodeURIComponent(prompt.prompt)}`}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition hover:text-accent"
          >
            Continue this in Clintoy
            <svg viewBox="0 0 16 16" className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8h9M9 4.5L12.5 8 9 11.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">no sign-in</span>
        </div>
      </div>
    </div>
  );
}
