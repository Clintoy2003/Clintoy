"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccessibilityMenu } from "./accessibility-menu";
import { Wordmark } from "./logo";

const NAV = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Prompt library", href: "/library" },
  { label: "Accessibility", href: "/accessibility" },
];

type MeResponse = { user: { displayName: string; email: string; avatarUrl: string | null } | null };

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: MeResponse | null) => {
        if (!cancelled) setLoggedIn(Boolean(data?.user));
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="Clintoy home" className="rounded-lg">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-ink-soft transition hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <AccessibilityMenu />
          </div>
          {loggedIn === false ? (
            <Link
              href="/login"
              className="hidden items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink sm:inline-flex"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href={loggedIn === false ? "/signup" : "/chat"}
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-accent"
          >
            {loggedIn === false ? "Create free account" : "Open Clintoy"}
            <svg viewBox="0 0 16 16" className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8h9M9 4.5L12.5 8 9 11.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink md:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
              {open ? <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /> : <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-line bg-card px-5 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/60 py-3 text-base text-ink-soft"
              >
                {item.label}
              </Link>
            ))}
            {loggedIn === false ? (
              <Link href="/login" onClick={() => setOpen(false)} className="border-b border-line/60 py-3 text-base text-ink-soft">
                Sign in
              </Link>
            ) : null}
          </nav>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted">Display & accessibility</span>
            <AccessibilityMenu />
          </div>
        </div>
      ) : null}
    </header>
  );
}
