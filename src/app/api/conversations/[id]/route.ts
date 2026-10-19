import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { getConversationForUser, getMessages, isUuid, serializeConversation } from "@/lib/chat-data";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function resolve(idPromise: Promise<{ id: string }>) {
  const { id } = await idPromise;
  if (!isUuid(id)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const conversation = await getConversationForUser(user.id, id);
  if (!conversation) return null;
  return { user, conversation, id };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await resolve(params);
  if (!resolved) return Response.json({ error: "Not found" }, { status: 404 });
  const messages = await getMessages(resolved.user.id, resolved.id);
  return Response.json({ conversation: serializeConversation(resolved.conversation), messages: messages ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await resolve(params);
  if (!resolved) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = body as { title?: unknown; pinned?: unknown };
  const update: { title?: string; pinned?: boolean; updatedAt?: Date } = {};

  if (typeof payload.title === "string") {
    const title = payload.title.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!title) return Response.json({ error: "A title is required" }, { status: 422 });
    update.title = title;
  }
  if (typeof payload.pinned === "boolean") update.pinned = payload.pinned;
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 422 });
  }
  update.updatedAt = new Date();

  const user: SessionUser = resolved.user;
  const [updated] = await db
    .update(conversations)
    .set(update)
    .where(and(eq(conversations.id, resolved.id), eq(conversations.userId, user.id)))
    .returning();

  return Response.json({ conversation: updated ? serializeConversation(updated) : null });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await resolve(params);
  if (!resolved) return Response.json({ error: "Not found" }, { status: 404 });
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, resolved.id), eq(conversations.userId, resolved.user.id)));
  return Response.json({ ok: true });
}
