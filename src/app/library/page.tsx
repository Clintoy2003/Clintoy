import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LibraryBrowser } from "@/components/library-browser";
import { listPrompts } from "@/lib/prompts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prompt library",
  description:
    "Tested prompts for writing, work, code, learning and life admin. Copy one, or send it straight into Clintoy.",
};

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8h9M9 4.5L12.5 8 9 11.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function LibraryPage() {
  const prompts = await listPrompts();
  const categories = new Set(prompts.map((prompt) => prompt.category));
  const totalUses = prompts.reduce((sum, prompt) => sum + prompt.uses, 0);

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
                <li aria-current="page" className="text-ink-soft">Prompt library</li>
              </ol>
            </nav>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="sticker">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {prompts.length} prompts · {categories.size} categories
                </p>
                <h1 className="mt-5 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.05] text-ink">
                  A good question is half the work.
                </h1>
                <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ink-soft">
                  Every prompt here was written to produce an artefact: something you can send, ship, study or
                  decide from. Copy one, or open it in Clintoy where it will fill in the blanks with you.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                <div className="bg-card p-4">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">Total uses</dt>
                  <dd className="mt-1 text-3xl font-semibold text-ink">{totalUses.toLocaleString("en-US")}</dd>
                </div>
                <div className="bg-card p-4">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">Borrowed today</dt>
                  <dd className="mt-1 text-3xl font-semibold text-ink">∞</dd>
                </div>
                <div className="bg-card col-span-2 p-4">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">Cost</dt>
                  <dd className="mt-1 text-sm text-ink-soft">Free with any account. Copy without limits.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <LibraryBrowser
            prompts={prompts.map((prompt) => ({
              id: prompt.id,
              title: prompt.title,
              category: prompt.category,
              summary: prompt.summary,
              body: prompt.body,
              tags: prompt.tags,
              uses: prompt.uses,
            }))}
          />
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-line bg-paper-soft px-6 py-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Nothing here fits? Ask in your own words.</h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted">
                Clintoy is built for unpolished questions. Bring the whole mess and it will structure it with you.
              </p>
            </div>
            <Link
              href="/chat"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-accent"
            >
              Open Clintoy <Arrow />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
