import { createSession, createUserWithPassword, findUserByEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { email?: unknown; password?: unknown; name?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address." }, { status: 422 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Use a password with at least 8 characters." }, { status: 422 });
  }
  if (password.length > 256) {
    return Response.json({ error: "That password is too long." }, { status: 422 });
  }
  if (!name || name.length < 2) {
    return Response.json({ error: "Tell us what to call you (at least 2 characters)." }, { status: 422 });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return Response.json(
        { error: "An account already exists for that email. Try signing in instead." },
        { status: 409 },
      );
    }

    const user = await createUserWithPassword(email, password, name);
    await createSession(user.id);

    return Response.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
    });
  } catch (error) {
    console.error("signup failed", error);
    return Response.json({ error: "Couldn't create your account just now. Try again shortly." }, { status: 503 });
  }
}
