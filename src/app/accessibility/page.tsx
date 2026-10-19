import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccessibilityMenu } from "@/components/accessibility-menu";

export const metadata: Metadata = {
  title: "Accessibility & privacy",
  description:
    "How Clintoy is built to be used by everyone: contrast, text size, keyboard support, screen-reader behaviour, reduced motion, and exactly what happens to your data.",
};

const COMMITMENTS = [
  {
    title: "Text that reflows, not shrinks",
    body: "Three text sizes up to 125% of default, and layouts built with relative units so 200% zoom still stacks correctly without horizontal scrolling.",
  },
  {
    title: "Contrast you don't have to strain for",
    body: "Body text meets WCAG 2.2 AA on the white background, with a high-contrast switch that pushes text close to pure black or white when you need it.",
  },
  {
    title: "Keyboard-first, not keyboard-only",
    body: "Every control is reachable by Tab, operable with Enter or Space, and shows a visible 2px focus ring. The skip link jumps straight to the main content.",
  },
  {
    title: "Announced, not just displayed",
    body: "Conversation replies sit in a polite live region, status messages (copy, export, delete) are announced, and every icon-only button carries an accessible name.",
  },
  {
    title: "Motion is optional",
    body: "The reduced-motion switch pauses loading animations and message transitions, and the system prefers-reduced-motion setting is respected automatically.",
  },
  {
    title: "Plain language on purpose",
    body: "Error messages say what happened and what to do next. No jargon to make a limitation feel like a feature.",
  },
  {
    title: "Speak instead of type",
    body: "A microphone button in the composer dictates straight into the message box using your browser's own speech engine — nothing is uploaded to a transcription server.",
  },
];

const SHORTCUTS = [
  { keys: "⌘K / Ctrl K", action: "Start a new conversation" },
  { keys: "Enter", action: "Send your message" },
  { keys: "Shift + Enter", action: "Add a new line without sending" },
  { keys: "Tab / Shift Tab", action: "Move between controls" },
  { keys: "Esc", action: "Close the mobile drawer or display panel" },
  { keys: "Tab (first press)", action: "Reveal the skip-to-content link" },
  { keys: "Mic button", action: "Dictate your message using on-device speech recognition" },
];

export default function AccessibilityPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="border-b border-line">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
            <nav aria-label="Breadcrumb" className="text-xs text-muted">
              <ol className="flex items-center gap-2">
                <li><Link href="/" className="underline-link">Clintoy</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink-soft">Accessibility & privacy</li>
              </ol>
            </nav>
            <p className="sticker mt-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              statement · updated {new Date().getFullYear()}
            </p>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.05] text-ink">
              Built so that everyone can use it.
            </h1>
            <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-ink-soft">
              Accessibility is not a settings page bolted onto the end. It shapes the contrast, the markup, the
              keyboard order and the way Clintoy talks about failure. Here is what we&apos;ve actually implemented,
              and where we still have work to do.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink-soft">
                <span className="text-xs uppercase tracking-[0.14em] text-muted">Try it now</span>
                <AccessibilityMenu variant="link" />
              </div>
              <Link href="/chat" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent">
                Open Clintoy
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <h2 className="text-[clamp(1.6rem,3vw,2rem)] font-semibold leading-tight text-ink">What&apos;s implemented</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Targets WCAG 2.2 level AA for Clintoy and the marketing pages. These are internal checks, not a
            third-party certification — we say so rather than implying one.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMMITMENTS.map((item, index) => (
              <div key={item.title} className="card-paper rounded-2xl p-5">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent">
                  0{index + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold leading-tight text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="keyboard" className="scroll-mt-24 border-y border-line bg-paper-soft">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Keyboard</p>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2rem)] font-semibold leading-tight text-ink">
                Everything works without a mouse.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The composer keeps focus after sending, so you can hold a conversation without reaching for a
                pointer. Dialogs and drawers close with Escape and return focus to the control that opened them.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Keyboard shortcuts available in Clintoy</caption>
                <thead>
                  <tr className="border-b border-line bg-paper-soft">
                    <th scope="col" className="px-4 py-2.5 text-left text-[0.65rem] uppercase tracking-[0.14em] text-muted">Keys</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-[0.65rem] uppercase tracking-[0.14em] text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUTS.map((row) => (
                    <tr key={row.keys} className="border-b border-line/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <kbd className="rounded border border-line bg-paper-soft px-1.5 py-0.5 font-mono text-[0.7rem] text-ink">{row.keys}</kbd>
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Privacy</p>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2rem)] font-semibold leading-tight text-ink">
                What happens to what you type.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Short version: it stays here, tied to your account, protected by a password or Google sign-in, and
                you can erase it.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  q: "What is stored?",
                  a: "Your name, email address, and either a securely hashed password or a Google account identifier — never a plain-text password. Plus the text of your conversations, any images you generate and a timestamp for each. That is all.",
                },
                {
                  q: "Is there tracking or advertising?",
                  a: "No analytics scripts, no advertising pixels, no fingerprinting, no session recording. The site loads fonts from Google Fonts; self-host them for a fully offline deployment.",
                },
                {
                  q: "Is my content used for training?",
                  a: "No. There is no training pipeline in this application. If a cloud model key is configured, the request goes directly to that provider under their terms, and Clintoy labels the reply as a cloud model so you always know.",
                },
                {
                  q: "What does \"Continue with Google\" share?",
                  a: "Only your name, email address and profile photo, requested through Google's standard OAuth consent screen. Clintoy never sees or stores your Google password.",
                },
                {
                  q: "How do I delete everything?",
                  a: "Delete individual conversations from the sidebar at any time. To remove your account entirely, email support and it will be deleted along with every conversation and image tied to it.",
                },
                {
                  q: "Who can read it?",
                  a: "Only you, while signed in, and anyone with direct access to this deployment's database. For a shared or public deployment, keep admin access tightly controlled.",
                },
              ].map((item) => (
                <details key={item.q} className="group rounded-xl border border-line bg-card px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink">
                    {item.q}
                    <span className="text-muted transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-6">
              <h2 className="text-xl font-semibold text-ink">Known limitations</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {[
                  "Voice input relies on your browser's built-in speech engine, so quality and language coverage vary by browser.",
                  "No formal third-party WCAG audit has been completed for this release.",
                  "The display settings are stored per browser, not per account.",
                  "The local engine can be wrong about open-ended facts — it says so in the interface.",
                  "Without a configured cloud image key, generated images are original abstract art rather than photorealistic pictures.",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-paper-soft p-6">
              <h2 className="text-xl font-semibold text-ink">Tell us what breaks</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                If any part of Clintoy gets in your way — a control you cannot reach, text that won&apos;t scale, a
                message a screen reader skips — we want the specifics. Concrete reports beat compliments.
              </p>
              <a
                href="mailto:access@clintoy.app?subject=Accessibility%20feedback"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent"
              >
                Email access@clintoy.app
              </a>
              <p className="mt-3 text-xs text-muted">
                We aim to reply within two working days, and to fix blocking issues in the next release.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
