import { sql } from "drizzle-orm";
import { db } from "@/db";
import { prompts } from "@/db/schema";

type SeedPrompt = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  tags: string;
  featured?: boolean;
};

export const CATEGORIES = ["All", "Writing", "Work", "Code", "Learning", "Creative", "Life admin"] as const;

export const PROMPT_SEED: SeedPrompt[] = [
  {
    id: "summarise-anything",
    title: "Summarise anything, faithfully",
    category: "Work",
    summary: "Condense a long thread or article without losing the decision.",
    body: "Summarise this: [paste the text]\n\nGive me: (1) a three-sentence summary, (2) the decision it implies, (3) what it deliberately leaves out.",
    tags: "summary,reading,meetings",
    featured: true,
  },
  {
    id: "kind-hard-email",
    title: "The kind hard email",
    category: "Writing",
    summary: "Say no clearly without burning the relationship.",
    body: "Write a warm but unambiguous email to [person/role] declining [request]. Keep it under 120 words, give one honest reason, and offer a smaller alternative I can actually deliver.",
    tags: "email,boundaries,tone",
    featured: true,
  },
  {
    id: "weekly-plan",
    title: "Plan a week that survives Tuesday",
    category: "Work",
    summary: "A realistic plan with slack built in, not an optimistic wish.",
    body: "Plan my week around these outcomes: [list 3]. I have [X] hours of meetings and can do deep work best in the [morning/evening]. Include one buffer block per day and tell me what to drop if the week goes sideways.",
    tags: "planning,priorities,focus",
    featured: true,
  },
  {
    id: "decide-between-two",
    title: "Decide between two options",
    category: "Work",
    summary: "Move from circular thinking to a comparable decision.",
    body: "I'm choosing between [option A] and [option B]. Context: [constraints, timeline, stakes]. Build a comparison canvas, name the cheapest reversible test, and give me a recommendation with the strongest counter-argument.",
    tags: "decisions,tradeoffs",
    featured: true,
  },
  {
    id: "study-anything",
    title: "Learn anything in four weeks",
    category: "Learning",
    summary: "Active recall plan with spaced review, not rereading.",
    body: "I want to learn [skill/topic] in four weeks with about [X] minutes a day. Build a plan around active recall, tell me what to build or produce each week, and give me 10 questions to test myself.",
    tags: "study,skills,recall",
    featured: true,
  },
  {
    id: "explain-like-ten",
    title: "Explain it like I'm ten",
    category: "Learning",
    summary: "A clear mental model first, jargon last.",
    body: "Explain [concept] to a curious ten-year-old using one everyday analogy, then describe where that analogy breaks down and what the real technical version adds.",
    tags: "explain,analogy,beginners",
  },
  {
    id: "code-review-eye",
    title: "A second pair of eyes",
    category: "Code",
    summary: "Catch the bug that only shows up in production.",
    body: "Review this code for bugs, security issues and unclear naming. Ask me for anything missing. Then give improved code in a fenced block and a short list of edge cases to test.\n\n```\n[paste code]\n```",
    tags: "code,review,debugging",
    featured: true,
  },
  {
    id: "explain-error",
    title: "Explain my error, then fix it",
    category: "Code",
    summary: "Understand the stack trace instead of pasting around it.",
    body: "I got this error: [paste error]. Here's the surrounding code: [paste]. Explain the cause in plain language, give the smallest fix, and tell me how to prevent it next time.",
    tags: "error,debug,learning",
  },
  {
    id: "feature-blueprint",
    title: "Blueprint a feature in 20 minutes",
    category: "Code",
    summary: "From vague idea to buildable slices.",
    body: "Help me design [feature] for a [stack] app. Give me: user story, data model, API contract, edge cases, and a first slice I can ship today without migrations.",
    tags: "architecture,product,planning",
  },
  {
    id: "landing-page-copy",
    title: "Landing copy that earns the scroll",
    category: "Writing",
    summary: "Promise, proof, objection, action.",
    body: "Write landing page copy for [product] used by [audience]. Lead with the outcome, include three concrete benefits, answer the top objection, and end with a single call to action. Give me two tones: plain and bold.",
    tags: "copywriting,marketing,conversion",
  },
  {
    id: "post-with-a-spine",
    title: "A social post with a spine",
    category: "Creative",
    summary: "A point of view instead of a vague announcement.",
    body: "Write a social post about [idea/launch] for [platform]. Hook in the first line, one specific example, one line of tension, and no more than two hashtags. Keep it under 120 words.",
    tags: "social,writing,voice",
  },
  {
    id: "name-things",
    title: "Name it well",
    category: "Creative",
    summary: "Names grouped by feeling, with reasons.",
    body: "Help me name [thing]. It does [description] for [audience]. Give me 12 names in three groups (clear, invented, playful), explain the feeling of each group, and shortlist three with a reason and a risk.",
    tags: "naming,brand,tone",
  },
  {
    id: "resume-rewrite",
    title: "Rewrite my bullet points",
    category: "Work",
    summary: "Outcome-first phrasing with real verbs.",
    body: "Rewrite these resume bullets to lead with outcomes and numbers, keep them under 20 words each, and flag any claim that needs evidence.\n\n[paste bullets]",
    tags: "resume,career,writing",
  },
  {
    id: "interview-prep",
    title: "Interview prep with real questions",
    category: "Work",
    summary: "Practise the uncomfortable questions early.",
    body: "I'm interviewing for [role] at [type of company]. Ask me five questions, one at a time. After each answer, give one strength, one gap and a sharper version of my answer.",
    tags: "interview,career,practice",
  },
  {
    id: "difficult-conversation",
    title: "Rehearse a difficult conversation",
    category: "Life admin",
    summary: "Open with facts, close with a request.",
    body: "Help me prepare to talk to [person] about [issue]. Give me a two-sentence opening, three points I can defend, the likely pushback, and a respectful close that names the next step.",
    tags: "conflict,communication,relationships",
  },
  {
    id: "weekly-review",
    title: "A 10-minute weekly review",
    category: "Life admin",
    summary: "Close the loops that quietly drain you.",
    body: "Run a 10-minute review with me. Ask me five short questions about what moved, what stalled, what I'm avoiding, what I'm grateful for, and what one thing to change next week. Keep it brisk.",
    tags: "ritual,reflection,habits",
  },
  {
    id: "meal-plan-budget",
    title: "Meals for the week, no drama",
    category: "Life admin",
    summary: "Five dinners from one sensible shop.",
    body: "Plan five dinners for [number] people with a [budget] budget. Use overlapping ingredients, keep each under 30 minutes, and give me one shopping list grouped by aisle.",
    tags: "food,budget,planning",
  },
  {
    id: "argue-against-me",
    title: "Argue against me",
    category: "Learning",
    summary: "Pressure-test an idea before the world does.",
    body: "Here's my position: [position]. Steelman the strongest opposing case, list what evidence would change my mind, and finish with the weakest part of my own argument.",
    tags: "thinking,debate,decisions",
  },
  {
    id: "meeting-to-action",
    title: "Turn notes into actions",
    category: "Work",
    summary: "Clear owners, clear dates, nothing implied.",
    body: "Turn these meeting notes into decisions, actions, owners and dates. Flag anything that was discussed but not actually decided.\n\n[paste notes]",
    tags: "meetings,action,notes",
  },
  {
    id: "bedtime-story",
    title: "A bedtime story, on request",
    category: "Creative",
    summary: "Gentle, specific and five minutes long.",
    body: "Write a five-minute bedtime story for a [age]-year-old about [character/setting]. Warm, a little funny, no peril, and end with everyone exactly where they want to be.",
    tags: "story,kids,gentle",
  },
];

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  await db
    .insert(prompts)
    .values(
      PROMPT_SEED.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        category: prompt.category,
        summary: prompt.summary,
        body: prompt.body,
        tags: prompt.tags,
        featured: prompt.featured ?? false,
      })),
    )
    .onConflictDoNothing({ target: prompts.id });
}

export async function ensurePrompts() {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  try {
    await seedPromise;
  } catch {
    // Database may not be migrated yet; callers fall back to the in-memory seed.
  }
}

export async function listPrompts() {
  await ensurePrompts();
  try {
    const rows = await db.select().from(prompts).orderBy(sql`uses desc, title asc`);
    if (rows.length > 0) return rows;
  } catch {
    // fall through to seed data
  }
  return PROMPT_SEED.map((prompt, index) => ({
    ...prompt,
    featured: prompt.featured ?? false,
    uses: 0,
    createdAt: new Date(Date.now() - index),
  }));
}
