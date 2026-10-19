import Link from "next/link";
import { ClintoyMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <ClintoyMark className="mx-auto h-12 w-12" />
        <p className="mt-6 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent">404 · nothing here</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5.5vw,3.2rem)] font-semibold leading-[1.05] text-ink">
          This page wandered off.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
          The page you asked for doesn&apos;t exist — or it moved while you were typing. Clintoy is still open.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/chat" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-accent">
            Open Clintoy
          </Link>
          <Link href="/" className="rounded-full border border-line-strong px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink">
            Back to the start
          </Link>
        </div>
      </div>
    </main>
  );
}
