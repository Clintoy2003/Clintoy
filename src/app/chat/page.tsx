import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatApp } from "@/components/chat/chat-app";
import { listConversations } from "@/lib/chat-data";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_MODE, isModeId, type ModeId } from "@/lib/ai/modes";
import { engineStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chat",
  description: "Clintoy: four modes plus image generation, persistent conversations, free account required.",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; mode?: string; conversation?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const next = `/chat${params.conversation ? `?conversation=${params.conversation}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const conversations = await listConversations(user.id);
  const initialMode: ModeId = isModeId(params.mode) ? params.mode : DEFAULT_MODE;
  const initialPrompt = typeof params.prompt === "string" ? params.prompt.slice(0, 4000) : "";
  const requestedConversation =
    typeof params.conversation === "string" && conversations.some((item) => item.id === params.conversation)
      ? params.conversation
      : null;
  const status = engineStatus();

  return (
    <ChatApp
      initialConversations={conversations}
      displayName={user.displayName}
      userEmail={user.email}
      avatarUrl={user.avatarUrl}
      initialPrompt={initialPrompt}
      initialMode={initialMode}
      initialConversationId={requestedConversation}
      engineLabel={`${status.model} · ${status.cloud ? "cloud" : "local"}`}
    />
  );
}
