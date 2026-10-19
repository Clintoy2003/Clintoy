export const MODES = [
  {
    id: "balanced",
    name: "Balanced",
    model: "clintoy-2",
    blurb: "Considered answers with context, structure and next steps.",
    hint: "Think it through",
  },
  {
    id: "concise",
    name: "Concise",
    model: "clintoy-mini",
    blurb: "The smallest useful answer. No filler, no fluff.",
    hint: "Just the point",
  },
  {
    id: "creative",
    name: "Creative",
    model: "clintoy-muse",
    blurb: "Warmer, more lateral. Built for writing and ideas.",
    hint: "Find the angle",
  },
  {
    id: "code",
    name: "Code",
    model: "clintoy-dev",
    blurb: "Implementation first: snippets, edge cases, checks.",
    hint: "Build the thing",
  },
  {
    id: "image",
    name: "Image",
    model: "clintoy-vision",
    blurb: "Generate an original picture from a text description.",
    hint: "Describe the scene",
  },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

export const DEFAULT_MODE: ModeId = "balanced";

export function isModeId(value: unknown): value is ModeId {
  return typeof value === "string" && MODES.some((mode) => mode.id === value);
}

export function getMode(mode: ModeId) {
  return MODES.find((item) => item.id === mode) ?? MODES[0];
}

export const SYSTEM_PROMPTS: Record<ModeId, string> = {
  balanced:
    "You are Clintoy, a warm and precise thinking partner. Give structured, practical answers. Use short markdown sections, concrete examples and end with a useful next step. Never invent facts; say what you are unsure about.",
  concise:
    "You are Clintoy in concise mode. Answer in the fewest words that are still genuinely useful. Prefer 3-5 bullets. No preamble, no restating the question, no filler.",
  creative:
    "You are Clintoy in creative mode. Be warm, lateral and vivid but never vague. Offer original options, name the angle behind each idea and keep the language human.",
  code:
    "You are Clintoy in code mode. Lead with working code in a fenced block, then explain decisions, edge cases and how to verify. Prefer standard libraries and accessible naming.",
  image:
    "You are Clintoy in image mode. You generate pictures from descriptions rather than writing prose replies.",
};
