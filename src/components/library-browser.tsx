"use client";

import { useMemo, useState } from "react";
import { PromptCard, type PromptCardData } from "@/components/prompt-card";

export function LibraryBrowser({ prompts }: { prompts: PromptCardData[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(prompts.map((prompt) => prompt.category)));
    return ["All", ...unique];
  }, [prompts]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return prompts.filter((prompt) => {
      const inCategory = category === "All" || prompt.category === category;
      if (!inCategory) return false;
      if (!term) return true;
      return `${prompt.title} ${prompt.summary} ${prompt.body} ${prompt.tags} ${prompt.category}`
        .toLowerCase()
        .includes(term);
    });
  }, [category, prompts, query]);

  return (
    <div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <label htmlFor="prompt-search" className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Search the library
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13.5 13.5 17 17" strokeLinecap="round" />
            </svg>
            <input
              id="prompt-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “email”, “study”, “sql”, “summary”…"
              className="w-full rounded-full border border-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </div>
          <p role="status" aria-live="polite" className="text-xs text-muted">
            {filtered.length} of {prompts.length} prompts
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === item
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-paper text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-card px-5 py-10 text-center">
          <p className="text-xl font-semibold text-ink">Nothing matches that yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Try a broader term, or clear the filters. Clintoy is happy to take an unpolished question instead.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  );
}
