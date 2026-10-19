import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = body as { displayName?: unknown };
  const raw = typeof payload.displayName === "string" ? payload.displayName.trim().replace(/\s+/g, " ") : "";
  if (!raw || raw.length < 2) {
    return Response.json({ error: "Use at least two characters." }, { status: 422 });
  }

  const [updated] = await db
    .update(users)
    .set({ displayName: raw.slice(0, 40) })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    return Response.json({ error: "Could not update your name." }, { status: 404 });
  }
  return Response.json({ ok: true, displayName: updated.displayName });
}
