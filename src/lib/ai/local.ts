/**
 * Clintoy's on-device reasoning engine.
 *
 * No API key required: deterministic, inspectable reasoning templates that
 * genuinely do useful work (arithmetic, unit conversion, extractive summaries,
 * writing scaffolds, implementation snippets, comparison canvases).
 * When a cloud provider key is configured, src/lib/ai/index.ts prefers it.
 */

import type { ModeId } from "./modes";

export type Section = { heading: string; body: string };

export type Draft = {
  lead: string;
  sections: Section[];
  suggestions: string[];
  closing?: string;
};

const STOPWORDS = new Set(
  "a an and are as at be but by can could do does for from had has have he her his how i if in into is it its me my no not of on or our out she so than that the their them then there these they this to too us was we were what when where which who why will with would you your".split(
    " ",
  ),
);

const KNOWLEDGE: Record<string, { definition: string; points: string[]; analogy: string }> = {
  photosynthesis: {
    definition:
      "Photosynthesis is how plants, algae and some bacteria turn light energy into chemical energy, storing it as sugars while releasing oxygen.",
    points: [
      "Chlorophyll absorbs light, mostly red and blue wavelengths.",
      "Water is split, releasing oxygen as a by-product.",
      "Carbon dioxide is fixed into glucose via the Calvin cycle.",
    ],
    analogy: "Think of a leaf as a solar-powered kitchen: light is the stove, water and CO₂ are the ingredients, sugar is the meal.",
  },
  "machine learning": {
    definition:
      "Machine learning is the practice of fitting models to data so they can make useful predictions or decisions on new inputs instead of following hand-written rules.",
    points: [
      "Supervised learning maps labelled inputs to outputs; unsupervised learning finds structure without labels.",
      "Generalisation matters more than memorising the training set.",
      "Data quality, leakage and evaluation design decide most real-world outcomes.",
    ],
    analogy: "It is closer to learning to ride a bike than to following a recipe: you adjust from feedback, not from perfect instructions.",
  },
  "neural network": {
    definition:
      "A neural network is a stack of simple mathematical units, each mixing inputs with learned weights and passing the result through a non-linear function.",
    points: [
      "Training nudges weights to reduce a loss using gradients.",
      "Depth lets later layers build on simpler patterns.",
      "Attention-based transformers are one popular family, not the only one.",
    ],
    analogy: "Imagine a committee where every member only sees a slice of the problem and passes a short note upward until someone can decide.",
  },
  blockchain: {
    definition:
      "A blockchain is a database that many independent parties can append to, where entries are grouped into blocks and cryptographically chained so history is hard to rewrite.",
    points: [
      "Consensus rules decide which blocks are accepted.",
      "Useful when parties do not trust a shared administrator.",
      "It is usually a poor fit for private, fast, ordinary databases.",
    ],
    analogy: "A shared notebook where every page contains a fingerprint of the previous page, and everyone keeps a copy.",
  },
  recursion: {
    definition:
      "Recursion is solving a problem by reducing it to a smaller instance of itself, until a base case ends the chain.",
    points: [
      "Every recursive function needs a base case and a step that moves toward it.",
      "Recursion suits trees, divide-and-conquer and backtracking.",
      "Deep recursion can overflow the stack; iteration or memoisation may be safer.",
    ],
    analogy: "Standing between two mirrors: each reflection contains a smaller copy of the same scene, until the detail fades out.",
  },
  inflation: {
    definition:
      "Inflation is a sustained rise in the general price level, which means each unit of currency buys less than before.",
    points: [
      "Measured with a basket of goods, so your personal rate can differ.",
      "Driven by demand, supply constraints, expectations and money conditions.",
      "Real returns = nominal returns minus inflation.",
    ],
    analogy: "The ruler shrinks a little each year while the table stays the same size.",
  },
  "quantum computing": {
    definition:
      "Quantum computing uses qubits that can hold superpositions and become entangled, letting some classes of problems be approached with different algorithms.",
    points: [
      "It is not a faster computer for everyday tasks.",
      "Error correction and decoherence are the central engineering problems.",
      "Known advantages cluster around simulation, factorisation and some optimisation/search patterns.",
    ],
    analogy: "A classical bit is a coin lying heads or tails; a qubit is the coin mid-spin, and you only get an answer when it lands.",
  },
  http: {
    definition:
      "HTTP is the request/response protocol of the web: a client sends a method, path, headers and optional body, and a server returns a status, headers and body.",
    points: [
      "Methods convey intent: GET reads, POST creates, PATCH partially updates, DELETE removes.",
      "Status codes group into 2xx success, 3xx redirect, 4xx client error, 5xx server error.",
      "Stateless by design; cookies and tokens add continuity.",
    ],
    analogy: "A postal system: the envelope format is fixed, but the contents and the reply are up to the sender and receiver.",
  },
  api: {
    definition:
      "An API is a contract that lets one piece of software use another without knowing its internals.",
    points: [
      "Good APIs name things clearly and fail predictably.",
      "REST, GraphQL and RPC are styles, not quality guarantees.",
      "Versioning and error shapes are part of the contract.",
    ],
    analogy: "A restaurant menu: you choose from defined options rather than walking into the kitchen.",
  },
  oauth: {
    definition:
      "OAuth 2.0 is a delegation protocol: a user grants an app limited access to a resource without sharing their password.",
    points: [
      "Authorization code + PKCE is the default flow for web and mobile apps.",
      "Access tokens are short-lived; refresh tokens are guarded carefully.",
      "Scopes should be minimal and auditable.",
    ],
    analogy: "A hotel key card that opens the gym and your room, for two days, and can be cancelled at the desk.",
  },
  dns: {
    definition:
      "DNS translates human-readable domain names into the numeric addresses machines use to connect.",
    points: [
      "Resolution is cached at several layers, which is why changes are not instant.",
      "Records have types: A/AAAA, CNAME, MX, TXT, NS.",
      "TTL controls how long resolvers keep an answer.",
    ],
    analogy: "A contacts app for the internet: you pick a name, the system looks up the number.",
  },
  git: {
    definition:
      "Git is a distributed version control system that records snapshots of your project as commits, each pointing at its parents.",
    points: [
      "Branches are cheap labels on commits.",
      "`git pull --rebase` keeps history linear; `merge` preserves context.",
      "Commit early and locally; push finished, coherent work.",
    ],
    analogy: "A save file that remembers every route you took, so you can branch off a different ending at any point.",
  },
  sql: {
    definition:
      "SQL is a declarative language for describing the rows you want from relational data; the database chooses how to fetch them.",
    points: [
      "Execution order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.",
      "Joins combine rows by a matching key; indexes make those lookups fast.",
      "Use EXPLAIN to see the plan before adding indexes blindly.",
    ],
    analogy: "Filling in a form that describes what you want, and the librarian works out which shelves to check.",
  },
  "compound interest": {
    definition:
      "Compound interest is interest that earns interest on the accumulated total, so growth accelerates over time.",
    points: [
      "Formula: A = P(1 + r/n)^(nt).",
      "Time in the market matters more than small rate differences early on.",
      "Fees compound against you exactly the same way.",
    ],
    analogy: "A snowball rolling downhill: it grows faster because a bigger ball picks up more snow each turn.",
  },
  "opportunity cost": {
    definition:
      "Opportunity cost is the value of the best alternative you gave up when making a choice.",
    points: [
      "Applies to time as well as money.",
      "Invisible on invoices, decisive for good decisions.",
      "Compare against the realistic next-best option, not an impossible one.",
    ],
    analogy: "Choosing the left queue at the shop isn't just about the wait, it's about the slower queue you can no longer join.",
  },
  "supply and demand": {
    definition:
      "Supply and demand describes how prices move toward a level where the quantity people want to buy matches the quantity offered for sale.",
    points: [
      "Shifts in either curve move price and quantity.",
      "Elasticity measures how strongly quantity responds to price.",
      "Real markets are shaped by information, power and friction.",
    ],
    analogy: "A see-saw where buyers' eagerness sits on one end and sellers' willingness on the other.",
  },
  kubernetes: {
    definition:
      "Kubernetes is an orchestration system that keeps containerised workloads running at the state you declare.",
    points: [
      "Pods are the unit of scheduling; deployments manage pod replicas.",
      "Services and ingresses route traffic; config and secrets live separately.",
      "Complexity is real: a single well-managed VM is often enough to start.",
    ],
    analogy: "A building manager who keeps every light on, replacing bulbs before you notice they went out.",
  },
  "emotional intelligence": {
    definition:
      "Emotional intelligence is noticing, understanding and regulating your own feelings while reading and responding to other people's.",
    points: [
      "Name the emotion: naming reduces its grip.",
      "Separate the trigger from the story you tell about it.",
      "Regulation is a skill built through small repeated practice.",
    ],
    analogy: "A good driver doesn't remove the weather; they adjust speed, lights and distance.",
  },
  "habit formation": {
    definition:
      "Habits are repeated behaviours tied to a cue and made easy to repeat, storing the effort in automatic routines.",
    points: [
      "Make the cue obvious, the action small, the result satisfying.",
      "Environment design beats motivation on difficult days.",
      "Track streaks as evidence, not as a stick to beat yourself with.",
    ],
    analogy: "Water finding the same path down a hill: each run deepens the groove.",
  },
};

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function cleanTopic(raw: string) {
  let value = ` ${raw} `
    .replace(/\s+/g, " ")
    .replace(/^\s*(hi|hey|hello|ok|okay|so|well|please|help)[,!.\s]+/i, " ")
    .replace(/^\s*i(?:'m| am)\s+(?:stuck|not sure|confused|torn)(?:\s+(?:about|with|on|between))?\s*/i, " ")
    .replace(/^\s*(ideas?|options?|suggestions?)\s+(for|about|on)\s+/i, " ")
    .replace(/^\s*(plan|roadmap)\s+(for|to)\s+/i, " ")
    .replace(/^\s*(?:\d+|two|three|four|five|six|eight)\s+(?:weeks?|months?|days?)\s+(?:to|for)\s+/i, " ");
  const prefixes = [
    "can you",
    "could you",
    "please",
    "i want you to",
    "i need you to",
    "help me",
    "help me with",
    "i need",
    "give me",
    "show me",
    "tell me about",
    "tell me",
    "explain",
    "what is",
    "what's",
    "what are",
    "how does",
    "how do",
    "how can i",
    "how to",
    "write me",
    "write",
    "draft",
    "create",
    "make",
    "generate",
    "brainstorm",
    "some",
    "a",
    "an",
  ];
  let changed = true;
  while (changed) {
    changed = false;
    const lower = value.trim().toLowerCase();
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix + " ")) {
        value = value.trim().slice(prefix.length + 1);
        changed = true;
        break;
      }
    }
  }
  return value
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/^(ideas?|options?|suggestions?)\s+(for|about|on)\s+/i, "")
    .replace(/^(plan|roadmap)\s+/i, "")
    .replace(/^(?:\d+|two|three|four|five|six|eight)\s+(?:weeks?|months?|days?)\s+(?:to|for|of)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+(to|for|about|on|in)\s*$/i, "")
    .trim()
    .slice(0, 90);
}

function topicOf(message: string, fallback = "this") {
  const topic = cleanTopic(message);
  return topic.length > 1 ? topic : fallback;
}

const AUDIENCE_LABELS: Record<string, string> = {
  beginner: "beginners",
  kid: "kids",
  child: "children",
  children: "children",
  student: "students",
  expert: "experts",
  professional: "professionals",
  senior: "older readers",
  "non-technical": "non-technical readers",
};

function detectAudience(message: string): string | null {
  const match = message.match(/\b(beginners?|kids?|children|students?|experts?|professionals?|my (?:boss|team|manager|client|class)|seniors?|non[- ]technical)\b/i);
  if (!match) return null;
  const value = match[0].toLowerCase();
  if (value.startsWith("my ")) return value;
  return AUDIENCE_LABELS[value] ?? `${value}s`;
}

function has(message: string, pattern: RegExp) {
  return pattern.test(message);
}

function firstSentence(text: string) {
  const idx = text.search(/[.!?](\s|$)/);
  return idx === -1 ? text : text.slice(0, idx + 1);
}

/* ------------------------------------------------------------------ *
 * Arithmetic
 * ------------------------------------------------------------------ */

type Token = { type: "num"; value: number } | { type: "op"; value: string } | { type: "fn"; value: string };

const FUNCTIONS: Record<string, (n: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
};

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const source = expression.replace(/,/g, "").replace(/\s+/g, "");
  while (i < source.length) {
    const char = source[i];
    if (/\d|\./.test(char)) {
      let num = "";
      while (i < source.length && /[\d.]/.test(source[i])) num += source[i++];
      const value = Number(num);
      if (!Number.isFinite(value)) return null;
      tokens.push({ type: "num", value });
      continue;
    }
    if (/[a-z]/i.test(char)) {
      let name = "";
      while (i < source.length && /[a-z0-9]/i.test(source[i])) name += source[i++];
      const lower = name.toLowerCase();
      if (lower === "pi") tokens.push({ type: "num", value: Math.PI });
      else if (lower === "e") tokens.push({ type: "num", value: Math.E });
      else if (FUNCTIONS[lower]) tokens.push({ type: "fn", value: lower });
      else return null;
      continue;
    }
    if ("+-*/^%()".includes(char)) {
      tokens.push({ type: "op", value: char });
      i += 1;
      continue;
    }
    return null;
  }
  return tokens.length ? tokens : null;
}

function evaluateExpression(expression: string): number | null {
  const tokens = tokenize(expression);
  if (!tokens) return null;
  let pos = 0;

  const peek = () => tokens[pos];
  const eat = (value: string) => {
    const token = peek();
    if (token && token.type === "op" && token.value === value) {
      pos += 1;
      return true;
    }
    return false;
  };

  const parsePrimary = (): number => {
    const token = peek();
    if (!token) throw new Error("unexpected end");
    if (token.type === "num") {
      pos += 1;
      return token.value;
    }
    if (token.type === "fn") {
      pos += 1;
      if (!eat("(")) throw new Error("missing paren");
      const arg = parseExpression();
      if (!eat(")")) throw new Error("missing paren");
      return FUNCTIONS[token.value](arg);
    }
    if (token.type === "op" && token.value === "(") {
      pos += 1;
      const value = parseExpression();
      if (!eat(")")) throw new Error("missing paren");
      return value;
    }
    throw new Error("unexpected token");
  };

  const parseUnary = (): number => {
    if (eat("-")) return -parseUnary();
    if (eat("+")) return parseUnary();
    return parsePrimary();
  };

  const parsePower = (): number => {
    const base = parseUnary();
    if (eat("^")) return Math.pow(base, parsePower());
    return base;
  };

  const parseTerm = (): number => {
    let value = parsePower();
    for (;;) {
      if (eat("*")) value *= parsePower();
      else if (eat("/")) value /= parsePower();
      else if (eat("%")) value %= parsePower();
      else break;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    for (;;) {
      if (eat("+")) value += parseTerm();
      else if (eat("-")) value -= parseTerm();
      else break;
    }
    return value;
  };

  try {
    const value = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function tryMath(message: string): Draft | null {
  const percent = message.match(/(\d+(?:\.\d+)?)\s*%\s*(of|off)\s*(\d+(?:\.\d+)?)/i);
  if (percent) {
    const rate = Number(percent[1]);
    const base = Number(percent[3]);
    const amount = (rate / 100) * base;
    const remaining = percent[2].toLowerCase() === "off" ? base - amount : amount;
    return {
      lead: `${rate}% ${percent[2].toLowerCase()} ${formatNumber(base)} comes to **${formatNumber(remaining)}**.`,
      sections: [
        {
          heading: "The arithmetic",
          body: [
            `- ${rate}% as a decimal is ${formatNumber(rate / 100)}.`,
            `- ${formatNumber(rate / 100)} × ${formatNumber(base)} = ${formatNumber(amount)}.`,
            percent[2].toLowerCase() === "off"
              ? `- ${formatNumber(base)} − ${formatNumber(amount)} = **${formatNumber(remaining)}** after the discount.`
              : `- So ${rate}% of ${formatNumber(base)} is **${formatNumber(amount)}**.`,
          ].join("\n"),
        },
      ],
      suggestions: ["Add a 10% tip to that", "Express it as a fraction", "Compare two discount options"],
    };
  }

  const candidate = message
    .toLowerCase()
    .replace(/what(?:'s| is)|calculate|compute|solve|equals?|how much is|please/g, " ")
    .replace(/[=:?]/g, " ")
    .trim();
  if (!/\d/.test(candidate) || !/[+\-*/^%]|sqrt|log/.test(candidate)) return null;
  if (/[a-df-z]/.test(candidate.replace(/sqrt|abs|round|floor|ceil|sin|cos|tan|ln|log2?|pi|e/g, ""))) return null;

  const value = evaluateExpression(candidate);
  if (value === null) return null;
  return {
    lead: `That works out to **${formatNumber(value)}**.`,
    sections: [
      {
        heading: "What I computed",
        body: [
          `- Expression: \`${candidate.replace(/\s+/g, " ")}\``,
          `- Order of operations: brackets → powers → × ÷ → + −`,
          `- Result: **${formatNumber(value)}**`,
        ].join("\n"),
      },
      {
        heading: "How to check it",
        body: "Re-estimate with round numbers first. If your estimate and the exact result disagree by more than the rounding error, check the parentheses.",
      },
    ],
    suggestions: ["Round this to 2 decimals", "Show it as a percentage", "Now do the same for 1.5×"],
  };
}

/* ------------------------------------------------------------------ *
 * Unit conversion
 * ------------------------------------------------------------------ */

const CONVERSIONS: { from: RegExp; to: RegExp; factor: number; label: [string, string] }[] = [
  { from: /^km$|^kilometers?$/, to: /^mi$|^miles?$/, factor: 0.621371, label: ["km", "miles"] },
  { from: /^mi$|^miles?$/, to: /^km$|^kilometers?$/, factor: 1.60934, label: ["miles", "km"] },
  { from: /^kg$|^kilograms?$/, to: /^lb$|^lbs$|^pounds?$/, factor: 2.20462, label: ["kg", "lb"] },
  { from: /^lb$|^lbs$|^pounds?$/, to: /^kg$|^kilograms?$/, factor: 0.453592, label: ["lb", "kg"] },
  { from: /^m$|^meters?$/, to: /^ft$|^feet$/, factor: 3.28084, label: ["m", "ft"] },
  { from: /^ft$|^feet$/, to: /^m$|^meters?$/, factor: 0.3048, label: ["ft", "m"] },
  { from: /^c$|^celsius$/, to: /^f$|^fahrenheit$/, factor: Number.NaN, label: ["°C", "°F"] },
  { from: /^f$|^fahrenheit$/, to: /^c$|^celsius$/, factor: Number.NaN, label: ["°F", "°C"] },
  { from: /^cm$/, to: /^in$|^inch(es)?$/, factor: 0.393701, label: ["cm", "in"] },
];

function tryConversion(message: string): Draft | null {
  const match = message.match(
    /(\d+(?:\.\d+)?)\s*(km|kilometers?|mi|miles?|kg|kilograms?|lb|lbs|pounds?|m|meters?|ft|feet|cm|in|inch(?:es)?|c|celsius|f|fahrenheit)\s*(?:to|in|into|=)\s*(km|kilometers?|mi|miles?|kg|kilograms?|lb|lbs|pounds?|m|meters?|ft|feet|cm|in|inch(?:es)?|c|celsius|f|fahrenheit)/i,
  );
  if (!match) return null;
  const value = Number(match[1]);
  const from = match[2].toLowerCase();
  const to = match[3].toLowerCase();
  const rule = CONVERSIONS.find((item) => item.from.test(from) && item.to.test(to));
  if (!rule) return null;
  let result: number;
  if (Number.isNaN(rule.factor)) {
    const isToF = /f/.test(to);
    result = isToF ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
  } else {
    result = value * rule.factor;
  }
  return {
    lead: `${formatNumber(value)} ${rule.label[0]} is **${formatNumber(result)} ${rule.label[1]}**.`,
    sections: [
      {
        heading: "Working",
        body: [
          `- Input: ${formatNumber(value)} ${rule.label[0]}`,
          Number.isNaN(rule.factor)
            ? `- Temperature conversion: ${rule.label[0]} → ${rule.label[1]}`
            : `- Factor: × ${rule.factor}`,
          `- Output: **${formatNumber(result)} ${rule.label[1]}**`,
        ].join("\n"),
      },
    ],
    suggestions: ["Convert another value", "Explain the formula", "Make a small conversion table"],
  };
}

/* ------------------------------------------------------------------ *
 * Extract text helper
 * ------------------------------------------------------------------ */

function extractPastedText(message: string) {
  const afterColon = message.split(/:\s*\n?/).slice(1).join(": ");
  const body = afterColon.trim().length > 80 ? afterColon : message;
  return body.replace(/^(please\s+)?(summar[iy]se?|summarize|tl;?dr|condense|shorten)\s*(this|the following|it)?\s*[:\-]?\s*/i, "").trim();
}

/* ------------------------------------------------------------------ *
 * Summariser
 * ------------------------------------------------------------------ */

function summarize(message: string): Draft {
  const text = extractPastedText(message);
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);

  if (text.split(/\s+/).length < 25 || sentences.length < 2) {
    return {
      lead: "Paste the passage you want condensed and I'll pull out the spine of it. I work best with 80+ words.",
      sections: [
        {
          heading: "How I summarise",
          body: [
            "- **Rank sentences** by how many of the passage's key terms they carry.",
            "- **Keep the highest-value lines** in their original order, so the argument still reads.",
            "- **List the key terms** so you can see what the passage is really about.",
          ].join("\n"),
        },
        {
          heading: "Try it",
          body: "> Summarise this: [paste your article, email thread, or meeting notes]",
        },
      ],
      suggestions: ["Summarise an email I paste", "Turn a summary into bullets", "Make it 3 sentences shorter"],
    };
  }

  const words = text.toLowerCase().match(/[a-z']{3,}/g) ?? [];
  const frequency = new Map<string, number>();
  for (const word of words) {
    if (STOPWORDS.has(word)) continue;
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  const scored = sentences.map((sentence, index) => {
    const terms = sentence.toLowerCase().match(/[a-z']{3,}/g) ?? [];
    const score = terms.reduce((total, term) => total + (STOPWORDS.has(term) ? 0 : frequency.get(term) ?? 0), 0);
    return { sentence, index, score: score / Math.sqrt(terms.length || 1) };
  });
  const keep = new Set(
    scored
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(4, Math.max(2, Math.round(sentences.length / 4))))
      .map((item) => item.index),
  );
  const summary = scored
    .filter((item) => keep.has(item.index))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ");
  const keyTerms = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 220));

  return {
    lead: summary,
    sections: [
      {
        heading: "Key terms",
        body: keyTerms.map((term) => `\`${term}\``).join(" · "),
      },
      {
        heading: "Original in numbers",
        body: [
          `- ${wordCount} words across ${sentences.length} sentences`,
          `- About ${readMinutes} min reading time`,
          `- Compressed to ${summary.split(/\s+/).length} words (${Math.max(5, Math.round((summary.split(/\s+/).length / wordCount) * 100))}% of the original)`,
        ].join("\n"),
      },
      {
        heading: "What I kept out",
        body: "Repetition, examples and hedges. If a decision depends on one of those details, tell me which and I'll re-summarise with it prioritised.",
      },
    ],
    suggestions: ["Make it one sentence", "Turn it into bullets for a slide", "Rewrite it for a non-expert"],
  };
}

/* ------------------------------------------------------------------ *
 * Explanations
 * ------------------------------------------------------------------ */

function explain(message: string): Draft {
  const topic = topicOf(message);
  const lower = message.toLowerCase();
  const audience = detectAudience(message);
  const known = Object.keys(KNOWLEDGE).find((key) => lower.includes(key));
  const entry = known ? KNOWLEDGE[known] : null;
  const audienceLine = audience ? ` I've pitched this for ${audience}.` : "";
  const kidFriendly = audience ? /kid|child|children|senior/.test(audience) : false;

  if (entry) {
    return {
      lead: `${entry.definition}${audienceLine}`,
      sections: [
        { heading: "How it works", body: entry.points.map((point) => `- ${point}`).join("\n") },
        { heading: "Analogy", body: entry.analogy },
        {
          heading: "Check your understanding",
          body: [
            `1. Can you explain ${titleCase(known!)} to someone without using its own vocabulary?`,
            "2. Where would it give the wrong answer, and why?",
            "3. What is the smallest example you could sketch?",
          ].join("\n"),
        },
      ],
      suggestions: [`Give me an example of ${titleCase(known!)}`, `Quiz me on ${known}`, `Compare ${known} with an alternative`],
      closing: kidFriendly
        ? "Want it even simpler? Say *explain like I'm 10* and I'll strip it back further."
        : "Want a worked example or a stricter technical version? Just ask.",
    };
  }

  return {
    lead: `Let's build a working understanding of **${topic}**. The fastest route is definition → mechanism → example → limits.`,
    sections: [
      {
        heading: "1. Define it precisely",
        body: [
          `- What is ${topic} *not*? Naming the near-misses sharpens the boundary.`,
          "- Who or what does it act on? Name the inputs.",
          "- What changes because it exists? That's the output.",
        ].join("\n"),
      },
      {
        heading: "2. Find the mechanism",
        body: [
          `- Break ${topic} into three steps: trigger → process → result.`,
          "- Write each step in a sentence you could defend to an expert.",
          "- If a step feels vague, that's your reading list.",
        ].join("\n"),
      },
      {
        heading: "3. Test it on one real example",
        body: [
          `Pick the smallest concrete case of ${topic} you can find.`,
          "",
          "> Try: take one example and ask *why did it happen this way instead of another way?* The answer is usually the actual lesson.",
        ].join("\n"),
      },
      {
        heading: "4. Map the limits",
        body: [
          "- Where does it break? Every model has a failure mode.",
          "- What does it cost — money, time, risk?",
          "- What's the closest competing idea, and when is that better?",
        ].join("\n"),
      },
    ],
    suggestions: [`Give me a concrete example of ${titleCase(topic)}`, `Explain ${titleCase(topic)} to a beginner`, `Make me a study plan for ${titleCase(topic)}`],
    closing:
      "I'm running Clintoy's local engine, which reasons with structure rather than a web model. Ask for an example, a quiz, or a counter-argument and I'll build it out.",
  };
}

/* ------------------------------------------------------------------ *
 * Code
 * ------------------------------------------------------------------ */

type Snippet = { test: RegExp; language: string; title: string; code: string; notes: string[] };

const SNIPPETS: Snippet[] = [
  {
    test: /fetch|api call|http request|request data|axios/i,
    language: "ts",
    title: "Fetch with timeout, status check and typed error",
    code: `async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Request failed: " + response.status + " " + response.statusText);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}`,
    notes: [
      "Always read `response.ok` — a 500 is not an exception in fetch.",
      "The timeout prevents a hung request from blocking your UI forever.",
      "Add retries only for idempotent requests, with exponential backoff.",
    ],
  },
  {
    test: /debounce|throttle|input lag/i,
    language: "ts",
    title: "Debounce that preserves types and cancels cleanly",
    code: `function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const search = debounce((term: string) => {
  void fetch("/api/search?q=" + encodeURIComponent(term));
}, 250);`,
    notes: [
      "Debounce waits for quiet; throttle limits frequency. Pick by intent.",
      "For async work, also guard against out-of-order responses with a request id or AbortController.",
      "Clean up the timer on unmount if the debounced call lives in a component.",
    ],
  },
  {
    test: /react|component|usestate|useeffect|hook/i,
    language: "tsx",
    title: "Accessible counter with keyboard support",
    code: `"use client";
import { useState } from "react";

export function Stepper({ min = 0, max = 10, step = 1 }) {
  const [value, setValue] = useState(min);
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div role="group" aria-labelledby="stepper-label" className="flex items-center gap-2">
      <span id="stepper-label">Guests</span>
      <button type="button" onClick={() => setValue((v) => clamp(v - step))}
        aria-label="Remove one guest" disabled={value <= min}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => setValue((v) => clamp(v + step))}
        aria-label="Add one guest" disabled={value >= max}>+</button>
    </div>
  );
}`,
    notes: [
      "`aria-live` announces the new value to screen readers.",
      "Disabled buttons need a visible reason or a helpful label.",
      "Keep derived state derived — don't store what you can compute.",
    ],
  },
  {
    test: /python|csv|pandas|dataframe/i,
    language: "python",
    title: "Read a CSV safely and aggregate in plain Python",
    code: `import csv
from collections import defaultdict
from pathlib import Path

totals = defaultdict(float)

with Path("orders.csv").open(newline="", encoding="utf-8") as handle:
    for row in csv.DictReader(handle):
        try:
            totals[row["customer"]] += float(row["amount"])
        except (KeyError, ValueError):
            continue  # skip malformed rows instead of crashing the job

for customer, total in sorted(totals.items(), key=lambda item: item[1], reverse=True)[:5]:
    print(f"{customer:<20} {total:,.2f}")`,
    notes: [
      "`newline=\"\"` matters: without it, Windows line endings corrupt rows.",
      "Skip bad rows loudly in logs; silent failures hide data quality issues.",
      "For very large files, stream with pandas `chunksize` or a database instead.",
    ],
  },
  {
    test: /sql|query|database|postgres|group by/i,
    language: "sql",
    title: "Top customers with a safe date window",
    code: `SELECT
  c.id,
  c.name,
  COUNT(o.id)       AS order_count,
  SUM(o.total_cents) AS revenue_cents
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
  AND o.status = 'paid'
GROUP BY c.id, c.name
HAVING SUM(o.total_cents) > 0
ORDER BY revenue_cents DESC
LIMIT 20;`,
    notes: [
      "Filter in `WHERE`, filter aggregates in `HAVING`.",
      "Create an index on `(customer_id, created_at)` if this runs often.",
      "Money in integer cents avoids floating-point rounding surprises.",
    ],
  },
  {
    test: /express|node server|endpoint|rest|route handler/i,
    language: "ts",
    title: "Validated JSON route handler (Next.js style)",
    code: `import { NextResponse } from "next/server";

type Payload = { email: string };

function parse(body: unknown): Payload | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>).email;
  if (typeof value !== "string" || !value.includes("@")) return null;
  return { email: value.trim().toLowerCase() };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = parse(body);
  if (!payload) return NextResponse.json({ error: "A valid email is required" }, { status: 422 });

  return NextResponse.json({ ok: true }, { status: 201 });
}`,
    notes: [
      "Treat every request body as hostile input.",
      "Return machine-readable error codes with human-readable messages.",
      "Distinguish 400 (malformed) from 422 (well-formed but invalid).",
    ],
  },
  {
    test: /regex|email validation|pattern/i,
    language: "ts",
    title: "Practical email validation (and its limit)",
    code: `const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/;

export function looksLikeEmail(value: string) {
  const trimmed = value.trim();
  return trimmed.length <= 254 && EMAIL.test(trimmed);
}

// The only real test is a confirmation email. Regex filters typos; it does not prove deliverability.`,
    notes: [
      "Perfection isn't the goal: reject obvious typos and let verification do the rest.",
      "Normalise with `trim().toLowerCase()` before storing.",
      "Never put a regex in a hot loop without checking catastrophic backtracking.",
    ],
  },
  {
    test: /sort|dedupe|unique|array|binary search|fibonacci|algorithm/i,
    language: "ts",
    title: "Dedupe + stable sort + binary search",
    code: `export function uniqueBy<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function stableSort<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
    .map(({ item }) => item);
}

export function binarySearch(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
    notes: [
      "`(low + high) >> 1` avoids nothing important for JS numbers, but reads as a classic midpoint.",
      "Binary search demands sorted input — assert it in a dev-only check.",
      "`O(n log n)` sorting is fine to 100k items; beyond that, consider a map keyed on the sort value.",
    ],
  },
];

function codeReply(message: string, mode: ModeId): Draft {
  const match = SNIPPETS.find((snippet) => snippet.test.test(message));
  const topic = topicOf(message, "your feature");
  const snippet = match ?? SNIPPETS[0];
  const isCodeMode = mode === "code";

  return {
    lead: match
      ? `Here's a working implementation for **${topic}**. ${firstSentence(snippet.notes[0])}`
      : `I'd tackle **${topic}** in three passes: smallest working version, then error handling, then polish. Here's a starting point you can adapt.`,
    sections: [
      {
        heading: match ? snippet.title : "Starting implementation",
        body: ["```" + snippet.language, snippet.code, "```"].join("\n"),
      },
      {
        heading: "Why this shape",
        body: snippet.notes.map((note) => `- ${note}`).join("\n"),
      },
      ...(isCodeMode
        ? [
            {
              heading: "Checks before you ship",
              body: [
                "- **Happy path:** one real input, asserted end to end.",
                "- **Empty state:** what renders when the list is empty?",
                "- **Failure path:** network error, invalid input, slow response.",
                "- **Cleanup:** timers, subscriptions and listeners released.",
              ].join("\n"),
            },
          ]
        : []),
    ],
    suggestions: ["Add tests for this", "Make it work with TypeScript strict mode", "Explain the trade-offs of this approach"],
    closing: isCodeMode
      ? "Paste your actual error message or existing code and I'll adapt the snippet to it."
      : "Tell me your framework, version and constraints and I'll narrow this down.",
  };
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

function writingReply(message: string, mode: ModeId): Draft {
  const topic = topicOf(message, "your idea");
  const audience = detectAudience(message);

  if (has(message, /\bhaiku\b/i)) {
    const subject = titleCase(topic.split(/\s+/).slice(0, 3).join(" ") || "quiet morning");
    return {
      lead: `Here's a haiku on **${subject}**:`,
      sections: [
        {
          heading: "First draft",
          body: `> ${subject} at first light\n> every small thing keeps its shape\n> the day learns your name`,
        },
        {
          heading: "Two variations",
          body: [
            "- **Warmer:** " + `${subject}, open hands\nold worries fold into chairs\nmorning makes no noise`,
            "- **Sharper:** " + `${subject} again\nthe same street, a different year\nnothing asks for me`,
          ].join("\n"),
        },
      ],
      suggestions: ["Make it a tanka", "Write one about saying goodbye", "Set it to a city at night"],
    };
  }

  if (has(message, /\b(poem|poetry|verse)\b/i)) {
    return {
      lead: `A first draft on **${topic}**, written to be read slowly:`,
      sections: [
        {
          heading: "Draft",
          body: `> We keep the thing we cannot name\n> in the drawer where keys go missing,\n> and call it ${topic}.\n>\n> Some nights it hums like a fridge\n> in another room of the house.\n> Some nights it is the house.`,
        },
        {
          heading: "What I was doing",
          body: [
            "- Concrete object (drawer, keys, fridge) instead of abstract adjectives.",
            "- One turn near the end so the poem earns its length.",
            "- Short lines so the reader supplies the breath.",
          ].join("\n"),
        },
      ],
      suggestions: ["Make it more joyful", "Write a version with a rhyme scheme", "Turn this into a song chorus"],
    };
  }

  if (has(message, /\b(email|e-mail|message to|reply to|note to)\b/i)) {
    const rawRecipient = message.match(/\b(?:email|e-mail|note|message)\s+(?:to|for)\s+(?:my\s+)?([a-z ]{2,24}?)(?:\s+about|\s+regarding|,|$)/i)?.[1];
    const recipient = rawRecipient
      ? /^(team|manager|boss|client|class|group)$/i.test(rawRecipient.trim())
        ? `the ${rawRecipient.trim()}`
        : rawRecipient.trim()
      : null;
    const aboutClause = message.match(/\b(?:about|regarding|on)\s+(.+)$/i)?.[1];
    const emailTopic =
      (aboutClause ? cleanTopic(aboutClause) : "") ||
      topic
        .replace(/^(an?\s+)?(e-?mail|note|message|reply)\s+(to|for|about)\s+(my\s+)?/i, "")
        .replace(/^[\w ]{2,20}?\s+(about|regarding|on)\s+/i, "")
        .replace(/^(about|regarding|on)\s+/i, "")
        .trim() ||
      topic;
    return {
      lead: `Here's an email you can send about **${emailTopic}**${recipient ? ` to ${recipient.trim()}` : ""}. It stays short, leads with the ask, and gives the reader an easy out.`,
      sections: [
        {
          heading: "Subject line",
          body: `**${titleCase(emailTopic.slice(0, 48))} — a quick next step**`,
        },
        {
          heading: "Draft",
          body: `Hi ${recipient ? titleCase(recipient.replace(/^the\s+/i, "")) : "[name]"},\n\nI wanted to raise **${emailTopic}** while there's still room to shape it.\n\nThe short version: this matters because it affects the next decision more than the last one. I've looked at what it would take, and the smallest version is comfortably within reach.\n\nCould we take 15 minutes this week to agree the first step? If now is not the moment, tell me the better window and I'll work around it.\n\nThanks,\n[Your name]`,
        },
        {
          heading: "Why it works",
          body: [
            "- The ask is in the first screen, not the last paragraph.",
            "- One concrete next step instead of a vague 'let me know'.",
            "- A graceful exit lowers the cost of replying.",
          ].join("\n"),
        },
      ],
      suggestions: ["Make it more formal", "Make it warmer and shorter", "Write the follow-up if they don't reply"],
    };
  }

  if (has(message, /\b(caption|social|instagram|tweet|linkedin|post)\b/i)) {
    return {
      lead: `Three angles for **${topic}** — pick the one that matches your audience.`,
      sections: [
        {
          heading: "The direct one",
          body: `${titleCase(topic)}.\nNo polish, no pitch. Here's what changed when we stopped doing it the slow way: we got to the part that actually matters.`,
        },
        {
          heading: "The story one",
          body: `We almost didn't build ${topic}.\n\nThe version everyone expected was bigger. So we removed half of it, kept the one thing that worked, and shipped that instead.\n\nTurns out the smaller thing was the whole idea.`,
        },
        {
          heading: "The useful one",
          body: `If you only take one thing from ${topic}, take this:\n\n1. Name the outcome in one sentence.\n2. Cut everything not needed for it.\n3. Ship the version you can defend.\n\nSave this for the next time scope creeps.`,
        },
      ],
      suggestions: ["Add emoji but keep it tasteful", "Write a 60-character version", "Give me 5 hooks instead"],
    };
  }

  if (has(message, /\b(outline|blog|article|newsletter|essay)\b/i)) {
    return {
      lead: `Here's an outline for **${topic}** that holds an argument instead of just listing facts.`,
      sections: [
        {
          heading: "Working title",
          body: `**${titleCase(topic)}: what actually changes?**`,
        },
        {
          heading: "Structure",
          body: [
            `1. **The scene** — a specific moment where ${topic} stops being abstract (100 words).`,
            "2. **The problem** — what the default approach costs. Name numbers if you have them.",
            "3. **The turn** — the insight that changes the approach.",
            "4. **The evidence** — two examples, one of them inconvenient.",
            "5. **The limits** — where this breaks; trust is built here.",
            "6. **The close** — one action the reader can take today.",
          ].join("\n"),
        },
        {
          heading: "Opening line to steal",
          body: `> The first time ${topic} mattered to me, it was inconveniently small — which is usually how the real lessons arrive.`,
        },
      ],
      suggestions: ["Write section 3 in full", "Give me 10 headline options", "Make the outline more contrarian"],
    };
  }

  if (has(message, /\b(name|naming|tagline|slogan)\b/i)) {
    const base = topic.split(/\s+/).slice(0, 2).join("");
    return {
      lead: `Naming options for **${topic}**, grouped by the feeling they create.`,
      sections: [
        {
          heading: "Clear and calm",
          body: ["- Northfold", `- ${titleCase(base)} Studio`, "- Plainly", "- Everyday Atlas"].join("\n"),
        },
        {
          heading: "Invented and ownable",
          body: ["- Kindra", "- Lumo", `- ${titleCase(base).slice(0, 5)}ly`, "- Nesso"].join("\n"),
        },
        {
          heading: "Tagline directions",
          body: [
            `- “${titleCase(topic)}, without the noise.”`,
            "- “Small tool. Serious thinking.”",
            "- “Made for the moment you get stuck.”",
          ].join("\n"),
        },
      ],
      suggestions: ["Check the names against a tone of voice", "Give me 10 more invented names", "Shortlist 3 and explain why"],
    };
  }

  const audienceLine = audience ? ` for ${audience}` : "";
  return {
    lead: `Here's a draft of **${topic}**${audienceLine}, opening with the line that should land.`,
    sections: [
      {
        heading: "Draft",
        body: `The problem with ${topic} is never the idea. It's the distance between the idea and the version other people can use.\n\nSo start with the smallest honest version: one example, one outcome, one reason to care. Then add the detail that answers the objection you know is coming.`,
      },
      {
        heading: "What to change next",
        body: [
          "- Swap any abstract noun for a specific moment.",
          "- Read it out loud: any sentence you rush is a sentence you don't believe.",
          "- Cut the first paragraph after a day away — it's usually warm-up.",
        ].join("\n"),
      },
    ],
    suggestions: ["Make it more playful", "Write a version for experts", "Tighten it to 100 words"],
    closing: mode === "creative" ? "Tell me the tone you want — wry, warm, precise — and I'll re-voice the whole thing." : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Planning, brainstorming, comparison, rewriting
 * ------------------------------------------------------------------ */

function planReply(message: string): Draft {
  const topic =
    topicOf(message, "your goal")
      .replace(/^plan\s+/i, "")
      .replace(/^(?:\d+|two|three|four|five|six|eight)\s+(?:weeks?|months?|days?)\s+(?:to|for|of)\s+/i, "")
      .replace(/^(learn|study|master|understand|practise|practice)\s+/i, "")
      .trim() || "your goal";
  const isTrip = has(message, /\b(trip|travel|itinerary|holiday|vacation)\b/i);
  const isStudy = has(message, /\b(study|learn|course|exam|revision|skill)\b/i);

  if (isTrip) {
    return {
      lead: `A three-day structure for **${topic}** that leaves room for the unplanned part.`,
      sections: [
        {
          heading: "Day 1 — orient",
          body: [
            "- Morning: arrive, drop bags, walk the nearest ten streets without a map.",
            "- Afternoon: one anchor sight worth the queue, then a long lunch nearby.",
            "- Evening: local grocery + balcony dinner; sleep off the travel.",
          ].join("\n"),
        },
        {
          heading: "Day 2 — go deep",
          body: [
            "- One neighbourhood, not five. Pick it by the food you want to eat.",
            "- Book the timed entry for the thing that sells out.",
            "- Keep 15:00–17:00 free: that's where good memories usually happen.",
          ].join("\n"),
        },
        {
          heading: "Day 3 — leave a hook",
          body: [
            "- Morning walk somewhere you'd return to.",
            "- Buy one small useful thing, not souvenirs.",
            "- Write down the three things to do next visit.",
          ].join("\n"),
        },
        { heading: "Pack smart", body: "- One charger, one adapter, one pair broken-in shoes.\n- Copies of documents offline (not only in email).\n- Leave 20% of the bag empty." },
      ],
      suggestions: ["Make it a budget version", "Add rainy-day swaps", "Turn this into a checklist I can tick"],
    };
  }

  if (isStudy) {
    return {
      lead: `A four-week plan for **${topic}** built around recall, not rereading.`,
      sections: [
        {
          heading: "Weeks 1–2: build the map",
          body: [
            "- 25 minutes daily: read once, then close the source and write what you remember.",
            "- Keep a single 'wrong answers' page — it becomes your best study material.",
            "- End each session by writing one question you still can't answer.",
          ].join("\n"),
        },
        {
          heading: "Weeks 3: make it active",
          body: [
            "- Teach the hardest idea out loud to an imaginary beginner (5 minutes).",
            "- Build 20 flashcards, maximum. Delete the ones you always get right.",
            "- Do one full practice task under time pressure.",
          ].join("\n"),
        },
        {
          heading: "Week 4: compress",
          body: [
            "- Two spaced reviews (day 22, day 26) of the wrong-answers page only.",
            "- One final pass through the practice task; compare against week 3.",
            "- Sleep is part of the plan, not a reward for finishing it.",
          ].join("\n"),
        },
        {
          heading: "Track it simply",
          body: "- Sessions: `[ ] [ ] [ ] [ ] [ ] [ ] [ ]`\n- Mark a session complete only if you wrote something from memory.",
        },
      ],
      suggestions: ["Turn this into a weekly calendar", "Design a 20-question quiz", "What should I do in the first 25 minutes?"],
    };
  }

  return {
    lead: `A real plan for **${topic}**, in the order the work actually happens.`,
    sections: [
      {
        heading: "1. Define done",
        body: "- Write the finished outcome in one sentence, in the past tense, as if it already happened.\n- Name the smallest version that still counts as success.",
      },
      {
        heading: "2. Split the work",
        body: [
          "- **This week:** the single highest-risk assumption.",
          "- **Next:** the build, deliberately unpolished.",
          "- **Then:** measurement and one round of refinement.",
        ].join("\n"),
      },
      {
        heading: "3. Decide what you'll drop",
        body: "- Pick three things you will explicitly not do. A plan without exclusions is a wish.",
      },
      {
        heading: "4. Review points",
        body: "- Set two calendar checks (midway, end). At each: keep / cut / change one thing.",
      },
    ],
    suggestions: ["Make this a 7-day checklist", "Identify the biggest risk", "Write the update email to my team"],
  };
}

function brainstormReply(message: string): Draft {
  const topic = topicOf(message, "your project");
  const audience = detectAudience(message);
  const angles = [
    ["The constraint flip", `Remove the thing everyone assumes is mandatory from ${topic}. What becomes possible with that missing?`],
    ["The tiny version", `What is the 10-minute version of ${topic} someone could try today, with almost no setup?`],
    ["The wrong audience", `Who would love ${topic} for reasons the usual buyer would find strange? That group often reveals the real value.`],
    ["The ritual", `Wrap ${topic} in a recurring moment (Monday reset, end-of-day review). Habits outlast features.`],
    ["The evidence play", `Publish the receipts behind ${topic}: real numbers, real timelines, one failure. Credibility becomes the differentiator.`],
    ["The pairing", `Join ${topic} to an unrelated habit — a walk, a coffee, a commute. Distribution is often a context change.`],
    ["The honest limit", `Name where ${topic} does not work. Objections answered up front build more trust than benefits listed.`],
    ["The one-screen rule", `Force ${topic} onto a single screen. Everything that doesn't fit becomes a follow-up, not a blocker.`],
  ];
  return {
    lead: `Eight starting directions for **${topic}**${audience ? ` for ${audience}` : ""} — deliberately varied, so at least one should feel uncomfortable in a useful way.`,
    sections: [
      {
        heading: "Angles",
        body: angles.map(([name, idea], index) => `${index + 1}. **${name}** — ${idea}`).join("\n"),
      },
      {
        heading: "Pick one in 10 minutes",
        body: "Score each angle 1–5 on: *would someone pay for it, could I build a rough version this week, would I enjoy talking about it for a month?* Multiply the scores; start with the highest.",
      },
    ],
    suggestions: ["Flesh out idea 2 into a one-page concept", "Combine ideas 1 and 5", "Pressure-test the weakest idea"],
    closing: "Tell me which one you want to pursue and I'll turn it into a first draft, a landing page or a build plan.",
  };
}

function compareReply(message: string): Draft {
  const parts = message.split(/\bvs\.?\b|\bversus\b|\bor\b/i).map((part) => cleanTopic(part)).filter(Boolean);
  const left = titleCase(parts[0] ?? "Option A");
  const right = titleCase(parts[1] ?? "Option B");
  return {
    lead: `A fair comparison starts before the verdict. Here's the canvas I'd use for **${left}** vs **${right}**.`,
    sections: [
      {
        heading: "The comparison canvas",
        body: [
          "| Question | " + left + " | " + right + " |",
          "| --- | --- | --- |",
          "| What problem does it solve first? | _describe in one line_ | _describe in one line_ |",
          "| Who is it clearly wrong for? | _name the anti-fit_ | _name the anti-fit_ |",
          "| Cost of adopting it (time, money, risk) | _estimate_ | _estimate_ |",
          "| Cost of leaving it later | _lock-in_ | _lock-in_ |",
          "| Evidence I actually have | _tested / hearsay_ | _tested / hearsay_ |",
        ].join("\n"),
      },
      {
        heading: "The three questions that usually decide it",
        body: [
          `1. Which one is easier to reverse if I'm wrong?`,
          `2. Which one still works if my scale is 10× smaller than planned?`,
          `3. Which one can I explain to a sceptic in one sentence?`,
        ].join("\n"),
      },
      {
        heading: "A decision rule",
        body: `If you're torn, choose the option with the cheapest reversal. That keeps ${left} and ${right} as a sequence instead of a bet.`,
      },
    ],
    suggestions: [`Give me a recommendation for ${left} vs ${right}`, "Add a row for maintenance cost", "Turn this into a scorecard"],
    closing: "Share your actual constraints (budget, timeline, team) and I'll turn the canvas into a recommendation with reasoning.",
  };
}

function rewriteReply(message: string): Draft {
  const text = extractPastedText(message);
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim().length > 12);
  const hasBody = sentences.length >= 2 && text.split(/\s+/).length >= 20;

  if (!hasBody) {
    return {
      lead: "Paste the text you want reworked and tell me the target: shorter, clearer, more formal, more human.",
      sections: [
        {
          heading: "What I'll do",
          body: [
            "- **Shorten:** keep the claim, cut the warm-up and the hedges.",
            "- **Clarify:** one idea per sentence, active verbs.",
            "- **Adjust tone:** same substance, different register.",
          ].join("\n"),
        },
      ],
      suggestions: ["Make my paste more concise", "Rewrite something formally", "Check the clarity of a paragraph"],
    };
  }

  const bulletized = sentences
    .slice(0, 6)
    .map((sentence) => `- ${sentence.trim().replace(/^[-•]\s*/, "")}`)
    .join("\n");
  const tightened = sentences
    .map((sentence) =>
      sentence
        .trim()
        .replace(/\b(in order to)\b/gi, "to")
        .replace(/\b(at this point in time)\b/gi, "now")
        .replace(/\b(due to the fact that)\b/gi, "because")
        .replace(/\b(very|really|quite|basically|actually)\s+/gi, ""),
    )
    .join(" ");

  return {
    lead: "Here it is in three registers: scannable, tighter and formal.",
    sections: [
      { heading: "Scannable version", body: bulletized },
      { heading: "Tighter version", body: tightened },
      {
        heading: "Formal version",
        body: tightened
          .replace(/\bdon't\b/gi, "do not")
          .replace(/\bcan't\b/gi, "cannot")
          .replace(/\bI'll\b/gi, "I will"),
      },
      {
        heading: "What I changed",
        body: [
          "- Removed softeners that weaken the claim (*very*, *actually*, *basically*).",
          "- Replaced wordy phrases with direct equivalents.",
          "- Kept your meaning and your examples intact.",
        ].join("\n"),
      },
    ],
    suggestions: ["Make it 30% shorter", "Rewrite it for a sceptical reader", "Turn this into an email"],
  };
}

function aboutReply(): Draft {
  return {
    lead: "I'm **Clintoy** — a thinking space for questions, writing, code and plans. Free forever, and nothing you type is sold.",
    sections: [
      {
        heading: "Four ways to work with me",
        body: [
          "- **Balanced** — considered answers with context and next steps.",
          "- **Concise** — the smallest useful answer.",
          "- **Creative** — warm, lateral writing and ideas.",
          "- **Code** — implementation first, with edge cases and checks.",
        ].join("\n"),
      },
      {
        heading: "What I'm genuinely good at here",
        body: [
          "- Summarising something you paste in.",
          "- Research scaffolds and study plans.",
          "- Writing emails, posts, outlines and names.",
          "- Turning a vague goal into a week-one plan.",
          "- Explanations with analogies and comprehension checks.",
        ].join("\n"),
      },
      {
        heading: "Honest note about the engine",
        body: "Clintoy runs a local reasoning engine by default: no model key required, fully private, works without a network. If a cloud provider key is configured on this deployment, I use it for open-ended questions and fall back to local reasoning otherwise.",
      },
    ],
    suggestions: ["Write an email to my team", "Plan my next four weeks", "Summarise something I paste in"],
  };
}

function timeReply(): Draft {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return {
    lead: `It's **${time} UTC** on ${date} by the server clock here.`,
    sections: [
      {
        heading: "If you need it locally",
        body: "Your browser shows local time in the corner of your device. For deadlines across teams, quote a timezone explicitly (for example `17:00 UTC`) so nobody has to guess.",
      },
    ],
    suggestions: ["Plan my afternoon around 3 tasks", "Draft a scheduling email", "Convert a deadline to another timezone"],
  };
}

function greetingReply(name?: string): Draft {
  return {
    lead: `Hello${name ? `, ${name.split(" ")[0]}` : ""}. I'm Clintoy. What are we thinking about today?`,
    sections: [
      {
        heading: "Good places to start",
        body: [
          "- Paste something dense and ask me to summarise it.",
          "- Describe a decision you're stuck on and I'll lay out the options.",
          "- Ask for a first draft of an email, plan or piece of code.",
        ].join("\n"),
      },
    ],
    suggestions: ["Summarise this for me: [paste text]", "Plan the next four weeks for a project", "Write a friendly follow-up email"],
  };
}

function fallbackReply(message: string, mode: ModeId): Draft {
  const topic = topicOf(message, "this");
  return {
    lead: `Let's make **${topic}** concrete. Here's how I'd get from where you are to a usable answer.`,
    sections: [
      {
        heading: "What I heard",
        body: `You're asking about ${topic}. The useful next move is usually to name the outcome: what should be true after this is solved?`,
      },
      {
        heading: "A useful pass, in three steps",
        body: [
          `1. **Narrow it:** what is the smallest version of ${topic} that still matters?`,
          "2. **Name the constraint:** time, money, skill or permission — pick the one that's actually binding.",
          "3. **Choose one action:** something finishable in 25 minutes.",
        ].join("\n"),
      },
      {
        heading: "Make the answer sharper",
        body: "Add any of these and I'll build something specific:\n- the audience or reader\n- the tone (plain, formal, playful)\n- the format (bullets, email, code, plan)\n- the constraint you can't change",
      },
    ],
    suggestions: [`Give me an example about ${titleCase(topic)}`, "Turn this into a plan", "Write a first draft for me"],
    closing:
      mode === "concise"
        ? undefined
        : "I'm the local engine, so I work by structure and templates rather than live web knowledge. Give me context and I'll do the heavy lifting.",
  };
}

/* ------------------------------------------------------------------ *
 * Composition
 * ------------------------------------------------------------------ */

function compose(draft: Draft, mode: ModeId): string {
  const sections = mode === "concise" ? draft.sections.slice(0, 2) : draft.sections;
  const body = sections
    .map((section) => `### ${section.heading}\n${section.body}`)
    .join("\n\n");
  let lead = draft.lead;
  if (mode === "concise") {
    lead = firstSentence(lead.replace(/\*\*/g, ""));
  }
  const closing = mode === "concise" ? undefined : draft.closing;
  return [lead, body, closing ? `---\n${closing}` : ""].filter(Boolean).join("\n\n");
}

function classify(message: string, mode: ModeId): Draft {
  const lower = message.toLowerCase();
  const trimmed = message.trim();

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening)|howdy|hiya)\b[!. ]*$/i.test(trimmed)) {
    return greetingReply();
  }
  if (has(lower, /\b(who are you|what can you do|what are you|how do you work|your capabilities|help me get started)\b/)) {
    return aboutReply();
  }
  if (has(lower, /\b(what time|what.?s the time|today.?s date|what day is)\b/)) return timeReply();

  const math = tryMath(message);
  if (math) return math;
  const conversion = tryConversion(message);
  if (conversion) return conversion;

  const wantsSummary = has(lower, /\b(summar\w*|tl;?dr|condense|shorten this|key points of)\b/);
  if (wantsSummary) return summarize(message);

  const wantsRewrite = has(lower, /\b(rewrite|reword|proofread|rephrase|make this (clearer|shorter|formal)|bullet points from|edit this)\b/);
  if (wantsRewrite) return rewriteReply(message);

  if (has(lower, /\bvs\.?\b|\bversus\b|\bcompare\b/)) return compareReply(message);

  if (has(lower, /\b(code|function|component|bug|error|typescript|javascript|python|sql|query|api|regex|algorithm|debug)\b/)) {
    return codeReply(message, mode);
  }

  if (
    has(
      lower,
      /\b(write|draft|compose|email|poem|haiku|caption|post|blog|outline|article|headline|tagline|slogan|name|names|naming|letter|story|cover letter|script)\b/,
    )
  ) {
    return writingReply(message, mode);
  }

  if (has(lower, /\b(plan|roadmap|schedule|itinerary|checklist|steps to|prepare|prep|organi[sz]e)\b/)) {
    return planReply(message);
  }

  if (has(lower, /\b(idea|ideas|brainstorm|suggest|options|alternatives|inspiration)\b/)) return brainstormReply(message);

  if (
    has(lower, /\b(explain|what is|what are|what.?s|how does|how do|why does|why do|define|meaning of|tell me about)\b/)
  ) {
    return explain(message);
  }

  if (has(lower, /\b(should i|help|stuck|confused|not sure|advice|thoughts on|review)\b/)) {
    const topic = topicOf(message, "the situation");
    return {
      lead: `Let's untangle **${topic}**. I'll ask the questions a good thinking partner would, then give you a place to start.`,
      sections: [
        {
          heading: "The clarifying questions",
          body: [
            "- What decision are you actually making, and by when?",
            "- What happens if you do nothing for a month?",
            "- Which part is facts, and which part is fear?",
          ].join("\n"),
        },
        {
          heading: "A way through",
          body: [
            "1. Write the decision as a question with two clear options.",
            "2. List what must be true for each option to work.",
            "3. Pick the test you can run cheapest this week.",
          ].join("\n"),
        },
      ],
      suggestions: ["Here's my situation: ", "Help me choose between two options", "Turn this into a decision table"],
    };
  }

  return fallbackReply(message, mode);
}

export function localEngine(message: string, mode: ModeId, displayName?: string): { content: string; suggestions: string[] } {
  const draft = classify(message, mode);
  if (draft.lead.includes("I'm Clintoy") && displayName) {
    draft.lead = `I'm **Clintoy** — a thinking space for questions, writing, code and plans. Free forever, and nothing you type is sold.`;
  }
  return { content: compose(draft, mode), suggestions: draft.suggestions.slice(0, 3) };
}

export function deriveTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Untitled thought";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return (words.length > 62 ? `${words.slice(0, 59).trimEnd()}…` : words).replace(/^[a-z]/, (c) => c.toUpperCase());
}

export function detectLocalCapability(message: string): string {
  const lower = message.toLowerCase();
  if (/\b(summar|tl;?dr|condense)\b/.test(lower)) return "extractive summariser";
  if (/[\d)]\s*[+\-*/^%]|% of|% off/.test(lower)) return "arithmetic engine";
  if (/\b(km|miles?|kg|lbs?|celsius|fahrenheit)\b/.test(lower)) return "unit converter";
  if (/\b(code|function|sql|python|typescript|component)\b/.test(lower)) return "code patterns";
  if (/\b(write|draft|email|poem|post|outline)\b/.test(lower)) return "writing studio";
  if (/\b(plan|roadmap|itinerary)\b/.test(lower)) return "planning canvas";
  return "reasoning templates";
}
