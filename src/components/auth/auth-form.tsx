"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/logo";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up on this deployment yet. Use email and password instead.",
  google_failed: "Google sign-in didn't complete. Please try again.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.3 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.7 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.4C41.5 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function AuthFormInner({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/chat";
  const googleError = searchParams.get("error");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(googleError ? GOOGLE_ERROR_MESSAGES[googleError] ?? "Something went wrong." : "");

  const isSignup = mode === "signup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (isSignup && name.trim().length < 2) {
      setError("Tell us what to call you (at least 2 characters).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.push(next.startsWith("/") ? next : "/chat");
      router.refresh();
    } catch {
      setError("Network hiccup. Please try again.");
      setLoading(false);
    }
  }

  const googleHref = `/api/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper-soft px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Clintoy home">
            <Wordmark />
          </Link>
        </div>

        <div className="card-paper rounded-2xl p-7 sm:p-8">
          <h1 className="text-2xl font-semibold text-ink">
            {isSignup ? "Create your free account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {isSignup
              ? "Takes under a minute. No credit card, ever."
              : "Sign in to pick up where you left off."}
          </p>

          <a
            href={googleHref}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-paper-soft"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            <span className="text-xs text-muted">or use email</span>
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {isSignup ? (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-invalid={Boolean(error)}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-xs font-medium text-ink-soft underline-link"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                aria-invalid={Boolean(error)}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-xl border border-line-strong bg-paper-soft px-3.5 py-2.5 text-sm text-ink">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-accent disabled:opacity-60"
            >
              {loading ? "Please wait…" : isSignup ? "Create free account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline-link">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Clintoy?{" "}
                <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline-link">
                  Create a free account
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Free, forever. By continuing you agree this is a demo product — don&apos;t use a password you use elsewhere.
        </p>
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper-soft" />}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
