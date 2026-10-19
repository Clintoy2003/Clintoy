"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      setMessage("That email looks incomplete — check for a typo?");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Something went wrong. Try again in a moment.");
        return;
      }
      setState("done");
      setMessage(data.message ?? "You're on the list.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Network hiccup. Try again?");
    }
  }

  return (
    <div className={compact ? "" : "w-full"}>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@yourdomain.com"
          autoComplete="email"
          aria-describedby="waitlist-status"
          aria-invalid={state === "error"}
          className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent disabled:opacity-60"
        >
          {state === "loading" ? "Adding…" : state === "done" ? "Added ✓" : "Get updates"}
        </button>
      </form>
      <p
        id="waitlist-status"
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-[1.1rem] text-xs ${state === "error" ? "text-accent" : "text-muted"}`}
      >
        {message || "Free updates only. No spam, no paid plans, unsubscribe any time."}
      </p>
    </div>
  );
}
