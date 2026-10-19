"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Settings = {
  theme: "light" | "dark";
  text: "base" | "lg" | "xl";
  contrast: "normal" | "high";
  motion: "full" | "reduced";
};

const DEFAULTS: Settings = { theme: "light", text: "base", contrast: "normal", motion: "full" };
const STORAGE_KEY = "clintoy-a11y";

function apply(settings: Settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.text = settings.text;
  root.dataset.contrast = settings.contrast;
  root.dataset.motion = settings.motion;
}

export function AccessibilityMenu({ variant = "icon" }: { variant?: "icon" | "link" }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
        setSettings(parsed);
        apply(parsed);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          const initial = { ...DEFAULTS, theme: "dark" as const };
          setSettings(initial);
          apply(initial);
        }
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  const update = useCallback((next: Partial<Settings>) => {
    setSettings((current) => {
      const merged = { ...current, ...next };
      apply(merged);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const groups: { label: string; key: keyof Settings; options: { value: string; label: string }[] }[] = [
    {
      label: "Appearance",
      key: "theme",
      options: [
        { value: "light", label: "Paper" },
        { value: "dark", label: "Night" },
      ],
    },
    {
      label: "Text size",
      key: "text",
      options: [
        { value: "base", label: "Default" },
        { value: "lg", label: "Large" },
        { value: "xl", label: "Largest" },
      ],
    },
    {
      label: "Contrast",
      key: "contrast",
      options: [
        { value: "normal", label: "Standard" },
        { value: "high", label: "High" },
      ],
    },
    {
      label: "Motion",
      key: "motion",
      options: [
        { value: "full", label: "Full" },
        { value: "reduced", label: "Reduced" },
      ],
    },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Accessibility and display settings"
        className={
          variant === "link"
            ? "underline-link text-sm text-ink-soft"
            : "flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink-soft transition hover:border-ink hover:text-ink"
        }
      >
        {variant === "link" ? (
          "Display settings"
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Accessibility and display settings"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-4 shadow-xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Make Clintoy yours</p>
              <p className="mt-0.5 text-xs text-muted">Settings stay on this device only.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="rounded-full p-1 text-muted transition hover:bg-paper-soft hover:text-ink"
              aria-label="Close settings"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {groups.map((group) => (
              <fieldset key={group.key}>
                <legend className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">{group.label}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((option) => {
                    const active = settings[group.key] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => update({ [group.key]: option.value } as Partial<Settings>)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-line bg-paper text-ink-soft hover:border-ink hover:text-ink"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <a href="/accessibility" className="underline-link text-xs text-muted">
              Accessibility statement
            </a>
            <button
              type="button"
              onClick={() => update(DEFAULTS)}
              className="text-xs font-semibold text-accent underline-link"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
