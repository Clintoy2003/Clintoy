# Clintoy — a simpler AI assistant

A complete, deployable AI assistant built with Next.js (App Router), PostgreSQL and Drizzle ORM.
Clean white interface, real accounts (email/password or Google), AI image generation, and a genuinely
functional engine that works with **zero API keys**.

## What works out of the box

| Area | Behaviour |
| --- | --- |
| Accounts | Email + password signup/login (bcrypt-hashed passwords, JWT session cookie) and "Continue with Google" OAuth. `/chat` requires a signed-in account — middleware redirects to `/login` otherwise. |
| Chat (`/chat`) | Persistent conversations per account, 5 modes (Balanced, Concise, Creative, Code, **Image**), regenerate, rename, pin, delete, export to Markdown, follow-up suggestions, voice input (on-device speech recognition), keyboard shortcuts. |
| Image generation | Local mode: a deterministic, seeded generative-art engine (gradients + shapes), zero API key, unique per prompt. Cloud mode: if `OPENAI_API_KEY` is set, real images are generated via the OpenAI Images API. Images render inline and can be downloaded. |
| Local text engine | Arithmetic parser, percentage maths, unit/temperature conversion, extractive summariser, explanations with 24 concept entries, email/poem/post/outline writers, planner, brainstormer, comparison canvas, rewriting, code snippets with edge cases. |
| Cloud upgrade (optional) | If `OPENAI_API_KEY`, `OPENROUTER_API_KEY` or `GROQ_API_KEY` is present, open-ended text questions go to that provider and replies are labelled "cloud model". Any failure falls back to the local engine. |
| Library (`/library`) | 20 curated prompts seeded into Postgres, live search, category filters, copy + "use in Clintoy" deep links, use counters. |
| Pricing | 100% free, no subscription or paid tier, ever. |
| Accessibility | Skip link, landmarks, labelled controls, focus rings, ARIA live regions, contrast-safe white palette, high-contrast mode, 3 text sizes, reduced-motion mode, keyboard navigation, plain-language statement at `/accessibility`. |
| SEO / publish | Metadata + Open Graph, `sitemap.xml`, `robots.txt`, SVG favicon, custom 404. |
| Data | Drizzle tables: `users`, `conversations`, `messages` (with `image_url`), `prompts`, `waitlist`. API routes validate input, require authentication, and enforce per-user rate limits. |

## Local development

```bash
npm install
npx drizzle-kit push   # create the tables
npm run dev
```

The prompt library seeds itself on first request.

## Environment

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db   # required
AUTH_SECRET=...                                     # required, signs session JWTs (already generated in .env)
NEXT_PUBLIC_SITE_URL=https://your-domain.com        # used for metadata/sitemap

# Optional: enable "Continue with Google"
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# Register this exact redirect URI in Google Cloud Console:
#   https://your-domain.com/api/auth/google/callback

# Optional: cloud text models
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
# OPENROUTER_API_KEY / GROQ_API_KEY also supported

# Optional: cloud image generation (uses OPENAI_API_KEY above)
OPENAI_IMAGE_MODEL=gpt-image-1
```

Without `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, the "Continue with Google" button shows a friendly
message explaining it isn't configured yet, and email/password sign-in keeps working normally.

## Publishing notes

- Deploy on any Node host (Vercel, Fly, Render, a VPS). Run `npx drizzle-kit push` against the production database.
- Set `NEXT_PUBLIC_SITE_URL` so Open Graph URLs and the sitemap are absolute, and register the Google OAuth
  redirect URI to match your real domain.
- Passwords are hashed with bcrypt; sessions are signed JWTs in an HTTP-only cookie — never stored in plain text.
- Billing is intentionally not wired up — Clintoy is free, full stop.
