import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { generateReply, type ChatTurn } from "@/lib/ai";
import { deriveTitle, localEngine } from "@/lib/ai/local";
import { generateImage } from "@/lib/ai/image";
import { DEFAULT_MODE, isModeId, type ModeId } from "@/lib/ai/modes";
import { DEFAULT_FREE_OPENROUTER_MODEL, isFreeOpenRouterModelId } from "@/lib/ai/models";
import { getConversationForUser, isUuid, serializeConversation, serializeMessage } from "@/lib/chat-data";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LENGTH = 4000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 40;

const buckets = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 2000) {
    for (const [bucketKey, stamps] of buckets) {
      if (stamps.every((stamp) => now - stamp > RATE_WINDOW_MS)) buckets.delete(bucketKey);
    }
  }
  return false;
}

function badRequest(message: string, status = 422) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Please sign in to use Clintoy.", code: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body", 400);
  }

  const payload = body as {
    message?: unknown;
    conversationId?: unknown;
    mode?: unknown;
  model?: unknown;
    regenerate?: unknown;
  };

  const rawMessage = typeof payload.message === "string" ? payload.message.trim() : "";
  const mode: ModeId = isModeId(payload.mode) ? payload.mode : DEFAULT_MODE;
  const selectedModel = isFreeOpenRouterModelId(payload.model) ? payload.model : DEFAULT_FREE_OPENROUTER_MODEL;
  const regenerate = payload.regenerate === true;
  const requestedConversation =
    typeof payload.conversationId === "string" && isUuid(payload.conversationId) ? payload.conversationId : null;

  if (!regenerate && (!rawMessage || rawMessage.length === 0)) {
    return badRequest("Write a message first.");
  }
  if (rawMessage.length > MAX_LENGTH) {
    return badRequest(`Messages are capped at ${MAX_LENGTH.toLocaleString("en-US")} characters.`);
  }

  if (isRateLimited(user.id)) {
    return Response.json(
      { error: "That's a lot of thinking. Take a breath and try again in a few minutes." },
      { status: 429 },
    );
  }

  try {
    let conversation = requestedConversation ? await getConversationForUser(user.id, requestedConversation) : null;
    if (requestedConversation && !conversation) {
      return Response.json({ error: "That conversation is not in your history." }, { status: 404 });
    }

    if (regenerate) {
      if (!conversation) return badRequest("Open a conversation to regenerate.");
      const recent = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(4);
      const lastAssistant = recent.find((row) => row.role === "assistant");
      if (lastAssistant) {
        await db.delete(messages).where(eq(messages.id, lastAssistant.id));
      }
      const [lastUser] = await db
        .select()
        .from(messages)
        .where(and(eq(messages.conversationId, conversation.id), eq(messages.role, "user")))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      if (!lastUser) return badRequest("There is nothing to regenerate yet.");

      if (mode === "image") {
        const image = await generateImage(lastUser.content);
        const [assistantMessage] = await db
          .insert(messages)
          .values({
            conversationId: conversation.id,
            role: "assistant",
            content: `Here's a new take on: ${image.caption}`,
            engine: image.engine,
            imageUrl: image.dataUrl,
          })
          .returning();
        await db.update(conversations).set({ updatedAt: new Date(), mode }).where(eq(conversations.id, conversation.id));
        return Response.json({
          conversationId: conversation.id,
          conversation: serializeConversation({ ...conversation, mode }),
          assistantMessage: serializeMessage(assistantMessage),
          suggestions: ["Try a different style", "Make it brighter", "Add more detail"],
          engine: image.engine,
          model: "clintoy-vision",
        });
      }

      const historyRows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(asc(messages.createdAt));
      const history: ChatTurn[] = historyRows
        .filter((row) => row.id !== lastUser.id)
        .slice(-10)
        .map((row) => ({ role: row.role === "assistant" ? "assistant" : "user", content: row.content }));

      const reply = await generateReply({
        message: lastUser.content,
        mode,
        history,
        displayName: user.displayName,
        model: selectedModel,
      });
      const [assistantMessage] = await db
        .insert(messages)
        .values({ conversationId: conversation.id, role: "assistant", content: reply.content, engine: reply.engine })
        .returning();
      await db.update(conversations).set({ updatedAt: new Date(), mode }).where(eq(conversations.id, conversation.id));

      return Response.json({
        conversationId: conversation.id,
        conversation: serializeConversation({ ...conversation, mode }),
        assistantMessage: serializeMessage(assistantMessage),
        suggestions: reply.suggestions,
        engine: reply.engine,
        model: reply.model,
      });
    }

    if (!conversation) {
      const [created] = await db
        .insert(conversations)
        .values({
          userId: user.id,
          title: deriveTitle(rawMessage),
          mode,
        })
        .returning();
      conversation = created;
    }

    const [userMessage] = await db
      .insert(messages)
      .values({ conversationId: conversation.id, role: "user", content: rawMessage })
      .returning();

    if (mode === "image") {
      const image = await generateImage(rawMessage);
      const [assistantMessage] = await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          role: "assistant",
          content: `Here's **${image.caption}**.`,
          engine: image.engine,
          imageUrl: image.dataUrl,
        })
        .returning();

      const updatedAt = new Date();
      await db
        .update(conversations)
        .set({
          updatedAt,
          mode,
          title:
            conversation.title === "Untitled thought" || conversation.title.length === 0
              ? deriveTitle(rawMessage)
              : conversation.title,
        })
        .where(eq(conversations.id, conversation.id));

      return Response.json({
        conversationId: conversation.id,
        conversation: serializeConversation({ ...conversation, mode, updatedAt }),
        userMessage: serializeMessage(userMessage),
        assistantMessage: serializeMessage(assistantMessage),
        suggestions: ["Try a different style", "Make it brighter", "Add more detail"],
        engine: image.engine,
        model: "clintoy-vision",
      });
    }

    const historyRows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(10);
    const history: ChatTurn[] = historyRows
      .reverse()
      .filter((row) => row.id !== userMessage.id)
      .map((row) => ({ role: row.role === "assistant" ? "assistant" : "user", content: row.content }));

    let reply;
    try {
      reply = await generateReply({
        message: rawMessage,
        mode,
        history,
        displayName: user.displayName,
        model: selectedModel,
      });
    } catch {
      const fallback = localEngine(rawMessage, mode);
      reply = {
        content: fallback.content,
        suggestions: fallback.suggestions,
        engine: "local" as const,
        model: "clintoy-2",
      };
    }

    const [assistantMessage] = await db
      .insert(messages)
      .values({ conversationId: conversation.id, role: "assistant", content: reply.content, engine: reply.engine })
      .returning();

    const updatedAt = new Date();
    await db
      .update(conversations)
      .set({
        updatedAt,
        mode,
        title:
          conversation.title === "Untitled thought" || conversation.title.length === 0
            ? deriveTitle(rawMessage)
            : conversation.title,
      })
      .where(eq(conversations.id, conversation.id));

    return Response.json({
      conversationId: conversation.id,
      conversation: serializeConversation({ ...conversation, mode, updatedAt }),
      userMessage: serializeMessage(userMessage),
      assistantMessage: serializeMessage(assistantMessage),
      suggestions: reply.suggestions,
      engine: reply.engine,
      model: reply.model,
    });
  } catch (error) {
    console.error("chat failed", error);
    return Response.json({ error: "Clintoy couldn't complete that thought. Try again?" }, { status: 500 });
  }
}
