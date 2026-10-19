import { db } from "@/db";
import { waitlist } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { email?: unknown; note?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const note = typeof payload.note === "string" ? payload.note.slice(0, 400) : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return Response.json({ ok: false, error: "That email doesn't look right — mind checking it?" }, { status: 422 });
  }

  try {
    await db.insert(waitlist).values({ email, note }).onConflictDoNothing({ target: waitlist.email });
    return Response.json({
      ok: true,
      message: "You're on the list. Free updates only, no paid plans.",
    });
  } catch {
    return Response.json({ ok: false, error: "Couldn't save that just now. Try again in a moment?" }, { status: 503 });
  }
}
