import Link from "next/link";
import { AccessibilityMenu } from "./accessibility-menu";
import { Wordmark } from "./logo";
import { WaitlistForm } from "./waitlist-form";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-soft">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A simpler AI assistant. Clintoy turns scattered questions into clear answers — private by default,
              free forever, with a free account to keep your chats safe.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              100% free · no subscription, ever
            </p>
          </div>

          <nav aria-label="Product" className="text-sm">
            <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink">Product</h2>
            <ul className="space-y-2 text-muted">
              <li><Link href="/chat" className="underline-link">Open Clintoy</Link></li>
              <li><Link href="/library" className="underline-link">Prompt library</Link></li>
              <li><Link href="/#how-it-works" className="underline-link">How it works</Link></li>
            </ul>
          </nav>

          <nav aria-label="Elsewhere" className="text-sm">
            <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink">Trust</h2>
            <ul className="space-y-2 text-muted">
              <li><Link href="/accessibility" className="underline-link">Accessibility statement</Link></li>
              <li><Link href="/accessibility#privacy" className="underline-link">Privacy & data</Link></li>
              <li><Link href="/accessibility#keyboard" className="underline-link">Keyboard shortcuts</Link></li>
              <li><a href="/api/health" className="underline-link">System status</a></li>
            </ul>
          </nav>

          <div>
            <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink">Stay posted</h2>
            <p className="mb-3 text-sm text-muted">
              Optional updates about new modes and templates. No spam, unsubscribe any time, never a paid plan.
            </p>
            <WaitlistForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Clintoy. Built to be used by everyone, including you.</p>
          <div className="flex items-center gap-4">
            <AccessibilityMenu variant="link" />
            <span aria-hidden="true">·</span>
            <Link href="/accessibility#privacy" className="underline-link">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
