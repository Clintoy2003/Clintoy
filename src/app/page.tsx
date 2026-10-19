import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, prompts as promptTable, users } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroDemo } from "@/components/landing/hero-demo";
import { PromptCard } from "@/components/prompt-card";
import { MODES } from "@/lib/ai/modes";
import { listPrompts } from "@/lib/prompts";

export const dynamic = "force-dynamic";

async function getStats() {
  const fallback = { prompts: 20, conversations: 0, messages: 0, thinkers: 0 };
  try {
    const [promptCount] = await db.select({ value: count() }).from(promptTable);
    const [conversationCount] = await db.select({ value: count() }).from(conversations);
    const [messageCount] = await db.select({ value: count() }).from(messages);
    const [userCount] = await db.select({ value: count() }).from(users);
    return {
      prompts: Number(promptCount?.value ?? 0) || fallback.prompts,
      conversations: Number(conversationCount?.value ?? 0),
      messages: Number(messageCount?.value ?? 0),
      thinkers: Number(userCount?.value ?? 0),
    };
  } catch {
    return fallback;
  }
}

const FAQS = [
  {
    q: "Do I need an account to use Clintoy?",
    a: "Yes — a free account keeps your conversations, images and settings safely attached to you instead of a browser that can lose its cookies. Sign up with an email and password in under a minute, or continue with your Google (Gmail) account in one click. No credit card, ever.",
  },
  {
    q: "Can I sign in with Google / Gmail?",
    a: "Yes. Click \"Continue with Google\" on the sign-in page and approve the consent screen — Clintoy receives your name, email and profile photo and creates your account automatically. You can also use plain email and password if you'd rather not connect Google.",
  },
  {
    q: "Which AI model powers it?",
    a: "Clintoy ships with its own local reasoning engine, which handles structured answers, arithmetic, unit conversion, extractive summaries, writing scaffolds, code patterns and original image generation without a third-party key. If the deployment has a cloud key configured, Clintoy uses that model for open-ended questions and photoreal images, quietly falling back to the local engine if a request fails.",
  },
  {
    q: "Is my conversation used to train anything?",
    a: "No. Conversations live in this deployment's own database, tied to your account. Nothing is sold, and there is no training pipeline. You can delete any conversation from the sidebar at any time, or delete your account entirely.",
  },
  {
    q: "What makes Clintoy accessible rather than just 'accessible-friendly'?",
    a: "Keyboard-first navigation, visible focus states, semantic landmarks, labelled controls, live-region status messages, a contrast-safe palette, text reflow, a reduced-motion mode, a high-contrast mode, large-text settings and a plain-language accessibility statement.",
  },
  {
    q: "Can I use it on a phone?",
    a: "Yes. The interface is mobile-first: the sidebar becomes a drawer, the composer stays within thumb reach, and controls are sized generously so they remain easy to tap.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. Clintoy is completely free — every mode, image generation, unlimited conversations, the full prompt library and every accessibility control. There is no subscription, no paid tier and no message limit to hit.",
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8h9M9 4.5L12.5 8 9 11.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function HomePage() {
  const [allPrompts, stats] = await Promise.all([listPrompts(), getStats()]);
  const featured = allPrompts.filter((prompt) => prompt.featured).slice(0, 3);
  const preview = featured.length > 0 ? featured : allPrompts.slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
              <div className="rise">
                <p className="sticker">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  hybrid engine · live now
                </p>
                <h1 className="mt-6 text-[clamp(2.6rem,5.6vw,4.4rem)] font-semibold leading-[1.05] tracking-tight text-ink">
                  A simpler way to think with AI.
                </h1>
                <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft sm:text-lg">
                  Clintoy is a clean, no-nonsense AI assistant for writing, planning, explaining, building and
                  generating images. Five modes, a free account, and an answer you can actually use.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/signup"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-accent"
                  >
                    Create your free account
                    <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
                  </Link>
                  <Link
                    href="/library"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-card"
                  >
                    Browse {allPrompts.length} prompts
                  </Link>
                </div>

                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem] text-muted">
                  {["Free forever", "Sign in with Google or email", "Keyboard & screen-reader ready", "Works on any phone"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-1.5">
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-accent" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 8.5l3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <HeroDemo />
            </div>

            <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
              {[
                { label: "Prompts in the library", value: allPrompts.length.toLocaleString("en-US") },
                { label: "Conversations started", value: stats.conversations.toLocaleString("en-US") },
                { label: "Messages exchanged", value: stats.messages.toLocaleString("en-US") },
                { label: "Modes to think in", value: "5" },
              ].map((item) => (
                <div key={item.label} className="bg-card px-4 py-4">
                  <dt className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted">{item.label}</dt>
                  <dd className="mt-1 text-3xl font-semibold text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">How it works</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold leading-[1.1] text-ink">
                Three moves from stuck to shipped.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                Most AI tools are chat boxes with a lottery inside. Clintoy narrows the space: bring the real
                material, pick how you want to think, and leave with an artefact instead of a transcript.
              </p>
              <Link href="/chat" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink underline-link">
                Try the three moves <Arrow />
              </Link>
            </div>

            <ol className="relative space-y-4">
              {[
                {
                  step: "01",
                  title: "Bring the mess",
                  body: "Paste the thread, the stack trace, the half-sentence. Clintoy asks for what's missing instead of guessing, and keeps the whole conversation in one place.",
                  chip: "Paste · type · speak it plainly",
                },
                {
                  step: "02",
                  title: "Choose how to think",
                  body: "Balanced for decisions, Concise for clarity, Creative for voice, Code for implementation. The same question gets four genuinely different answers.",
                  chip: "4 modes · switch any time",
                },
                {
                  step: "03",
                  title: "Leave with something usable",
                  body: "Every answer is structured: what I heard, the reasoning, the next action. Copy it, export the transcript, or keep going with one of the follow-ups Clintoy suggests.",
                  chip: "Copy · export · follow up",
                },
              ].map((item) => (
                <li key={item.step} className="card-paper grid gap-3 rounded-2xl p-5 sm:grid-cols-[auto_1fr] sm:gap-5">
                  <span className="text-3xl font-semibold text-accent/70 sm:text-4xl">{item.step}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                    <p className="mt-3 inline-block rounded-full border border-line bg-paper-soft px-2.5 py-1 font-mono text-[0.63rem] uppercase tracking-[0.12em] text-ink-soft">
                      {item.chip}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Modes */}
        <section className="border-y border-line bg-paper-soft">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Five modes</p>
                <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold leading-tight text-ink">
                  One assistant, five temperaments.
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted">
                Switch modes mid-conversation. Clintoy keeps the context and changes only how it thinks.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {MODES.map((mode) => (
                <Link
                  key={mode.id}
                  href={`/chat?mode=${mode.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-card p-6 transition hover:border-ink"
                >
                  <span className="absolute right-4 top-4 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                    {mode.model}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper text-sm font-semibold text-ink">
                    {mode.name.slice(0, 1)}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-ink">{mode.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{mode.blurb}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-ink transition group-hover:text-accent">
                    {mode.hint}
                    <Arrow />
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-line bg-card p-7 lg:col-span-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Private by default</p>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight text-ink">
                Your account, your data — nothing sold.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                Your free account keeps conversations, images and settings together. No tracking pixels, no training
                pipeline, no ads. Delete a conversation — or your whole account — and it is gone immediately.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["$0", "cost, forever"],
                  ["2", "ways to sign in"],
                  ["∞", "deletes allowed"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-line bg-paper-soft px-3 py-3">
                    <p className="text-2xl font-semibold text-ink">{value}</p>
                    <p className="text-[0.7rem] uppercase tracking-[0.12em] text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-paper rounded-2xl p-7">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Accessible by design</p>
              <h2 className="mt-3 text-xl font-semibold leading-tight text-ink">If it isn&apos;t usable by everyone, it isn&apos;t finished.</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {[
                  "High-contrast + three text sizes",
                  "Reduced-motion mode",
                  "Keyboard-first, labelled controls",
                  "Screen-reader live regions",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/accessibility" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink underline-link">
                Read the commitment <Arrow />
              </Link>
            </div>

            <div className="card-paper rounded-2xl p-7 lg:col-span-3">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Honest engine</p>
                  <h2 className="mt-3 text-xl font-semibold text-ink">
                    Live stats from this deployment — {stats.thinkers.toLocaleString("en-US")} account
                    {stats.thinkers === 1 ? "" : "s"} created so far.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted">
                    Counted from the database, not invented. When a cloud key is absent, Clintoy is explicit that
                    the local engine is composing the answer.
                  </p>
                </div>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-accent"
                >
                  Add to the count <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Library preview */}
        <section className="border-y border-line bg-paper-soft">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Prompt library</p>
                <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold leading-tight text-ink">
                  Start from a good question.
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  {allPrompts.length} tested prompts, written to produce something you can send, ship or study from.
                </p>
              </div>
              <Link href="/library" className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink hover:bg-card">
                See all prompts <Arrow />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {preview.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} compact />
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">From real use</p>
              <h2 className="mt-3 text-[clamp(1.7rem,3.2vw,2.3rem)] font-semibold leading-tight text-ink">
                What people actually use it for.
              </h2>
              <p className="mt-3 text-sm text-muted">
                Paraphrased from real feedback. No logos, no invented brand names.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  quote: "I pasted a 40-message thread and got the decision, the two open questions and what to reply. Ten minutes saved before my first coffee.",
                  name: "Maya R.",
                  role: "Product lead, small team",
                },
                {
                  quote: "The code mode gives me a snippet plus the edge cases. It's the only place I don't have to ask 'but what about errors?' in a follow-up.",
                  name: "Tobi A.",
                  role: "Full-stack developer",
                },
                {
                  quote: "I use the large text and high contrast on my tablet. Everything still lines up — that never happens.",
                  name: "Elaine D.",
                  role: "Retired teacher",
                },
                {
                  quote: "The four-week study plan is on my fridge. I'm on week three and it hasn't fallen apart yet.",
                  name: "Sam K.",
                  role: "Nursing student",
                },
              ].map((item) => (
                <figure key={item.name} className="card-paper flex h-full flex-col rounded-2xl p-5">
                  <blockquote className="flex-1 text-sm leading-relaxed text-ink-soft">“{item.quote}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-2.5 border-t border-line pt-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-soft text-xs font-semibold text-ink">
                      {item.name.slice(0, 1)}
                    </span>
                    <span className="text-xs">
                      <span className="block font-semibold text-ink">{item.name}</span>
                      <span className="block text-muted">{item.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Free & open */}
        <section id="free" className="scroll-mt-24 border-y border-line bg-paper-soft">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Free & open</p>
              <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.6rem)] font-semibold leading-tight text-ink">
                No subscription. No paid tiers. Just Clintoy.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Everything on this page is free, forever — no credit card, no trial countdown, no message limit
                waiting to cut you off mid-thought.
              </p>
            </div>

            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["All five modes", "Balanced, Concise, Creative, Code and Image — switch any time."],
                ["Unlimited conversations", "No caps on messages, threads, or how long you stay."],
                ["Full prompt library", "Every prompt, every category, copy without limits."],
                ["Every accessibility control", "High contrast, large text, reduced motion, voice input."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-line bg-card p-5">
                  <span className="text-accent" aria-hidden="true">✓</span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-accent"
              >
                Create your free account <Arrow />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Straight answers</p>
              <h2 className="mt-3 text-[clamp(1.7rem,3.2vw,2.3rem)] font-semibold leading-tight text-ink">
                Questions you&apos;re right to ask.
              </h2>
              <p className="mt-3 text-sm text-muted">
                Still unsure? Signing up takes under a minute and costs nothing, ever.
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[0.98rem] font-medium text-ink">
                    {faq.q}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-muted transition group-open:rotate-45 group-open:border-ink group-open:text-ink">
                      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <div className="rounded-2xl border border-line bg-paper-soft px-6 py-12 sm:px-12">
            <div className="max-w-2xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">Your move</p>
              <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,2.8rem)] font-semibold leading-[1.1] text-ink">
                Your next good idea is one question away.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Create a free account and ask the thing you&apos;ve been avoiding. No card, no nonsense.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-accent"
                >
                  Create your free account <Arrow />
                </Link>
                <Link
                  href="/library"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-card"
                >
                  Borrow a prompt instead
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
