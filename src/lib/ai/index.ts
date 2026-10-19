import { localEngine } from "./local";
import { getMode, SYSTEM_PROMPTS, type ModeId } from "./modes";
import { DEFAULT_FREE_OPENROUTER_MODEL, type FreeOpenRouterModelId } from "./models";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GeneratedReply = {
  content: string;
  suggestions: string[];
  engine: "cloud" | "local";
  model: string;
};

type Provider = {
  name: string;
  baseUrl: string;
  key: string;
  model: string;
};

function resolveProvider(selectedModel?: FreeOpenRouterModelId): Provider | null {
  const openrouter = process.env.OPENROUTER_API_KEY;
  if (openrouter) {
    return {
      name: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      key: openrouter,
      model: selectedModel ?? DEFAULT_FREE_OPENROUTER_MODEL,
    };
  }

  // A requested free OpenRouter model must not silently switch to a paid provider.
  if (selectedModel) return null;

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return {
      name: "openai",
      baseUrl: "https://api.openai.com/v1",
      key: openai,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    };
  }

  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return {
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      key: groq,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    };
  }

  return null;
}

export function engineStatus() {
  const provider = resolveProvider();
  return {
    engine: provider ? provider.name : "clintoy-local",
    cloud: Boolean(provider),
    model: provider ? provider.model : "clintoy-2",
  };
}

const MODE_SUGGESTIONS: Record<ModeId, string[]> = {
  balanced: ["Go deeper on the second point", "Turn this into a checklist", "What am I missing?"],
  concise: ["Shorter again", "Just the next action", "Show the reasoning"],
  creative: ["Try a bolder angle", "Rewrite it warmer", "Give me three variations"],
  code: ["Add error handling", "Write tests for this", "Make it production ready"],
  image: ["Try a different style", "Make it more colourful", "Generate a variation"],
};

async function callProvider(
  provider: Provider,
  params: { message: string; mode: ModeId; history: ChatTurn[]; displayName?: string },
): Promise<{ content: string; model: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const trimmedHistory = params.history.slice(-10);
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: params.mode === "creative" ? 0.9 : params.mode === "concise" ? 0.3 : 0.65,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: [SYSTEM_PROMPTS[params.mode], params.displayName ? `The user goes by ${params.displayName}.` : ""]
              .filter(Boolean)
              .join(" "),
          },
          ...trimmedHistory.map((turn) => ({ role: turn.role, content: turn.content })),
          { role: "user", content: params.message },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.length <= 1) return null;

    return {
      content,
      model: data.model?.trim() || provider.model,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function modeLabel(mode: ModeId) {
  return getMode(mode).model;
}

export async function generateReply(params: {
  message: string;
  mode: ModeId;
  history?: ChatTurn[];
  displayName?: string;
  model?: FreeOpenRouterModelId;
}): Promise<GeneratedReply> {
  const provider = resolveProvider(params.model);
  if (provider) {
    const cloud = await callProvider(provider, {
      message: params.message,
      mode: params.mode,
      history: params.history ?? [],
      displayName: params.displayName,
    });
    if (cloud) {
      return {
        content: cloud.content,
        suggestions: MODE_SUGGESTIONS[params.mode],
        engine: "cloud",
        model: cloud.model,
      };
    }
  }

  const local = localEngine(params.message, params.mode, params.displayName);
  return {
    content: local.content,
    suggestions: local.suggestions,
    engine: "local",
    model: "clintoy-2",
  };
}

