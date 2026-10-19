import { localEngine } from "@/lib/ai/local";
import { isModeId, DEFAULT_MODE } from "@/lib/ai/modes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = body as { message?: unknown; mode?: unknown };
  const message = typeof payload.message === "string" ? payload.message.slice(0, 500) : "";
  if (!message.trim()) {
    return Response.json({ error: "A message is required" }, { status: 422 });
  }
  const mode = isModeId(payload.mode) ? payload.mode : DEFAULT_MODE;
  try {
    const reply = localEngine(message, mode);
    return Response.json({ content: reply.content, suggestions: reply.suggestions });
  } catch {
    return Response.json(
      {
        content:
          "I couldn't parse that one cleanly. Try naming the outcome you want — a summary, a plan, a draft or a decision — and I'll take it from there.",
        suggestions: ["Plan my week", "Explain a concept", "Write a first draft"],
      },
      { status: 200 },
    );
  }
}
