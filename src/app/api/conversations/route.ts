import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/lib/chat-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ conversations: [] }, { status: 401 });
  const conversations = await listConversations(user.id);
  return Response.json({ conversations, displayName: user.displayName });
}
