import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";

export type ConversationSummary = {
  id: string;
  title: string;
  mode: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageView = {
  id: string;
  role: string;
  content: string;
  engine: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export function serializeConversation(row: typeof conversations.$inferSelect): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeMessage(row: typeof messages.$inferSelect): MessageView {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    engine: row.engine,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  try {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.pinned), desc(conversations.updatedAt))
      .limit(60);
    return rows.map(serializeConversation);
  } catch {
    return [];
  }
}

export async function getConversationForUser(userId: string, conversationId: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getMessages(userId: string, conversationId: string): Promise<MessageView[] | null> {
  const conversation = await getConversationForUser(userId, conversationId);
  if (!conversation) return null;
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(200);
  return rows.map(serializeMessage);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
