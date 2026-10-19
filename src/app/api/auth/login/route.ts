import { createSession, findUserByEmail, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { email?: unknown; password?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return Response.json({ error: "Enter your email and password." }, { status: 422 });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) {
      return Response.json(
        { error: "We couldn't find an account with that email and password. Check Google sign-in if you used it before." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "That password doesn't match. Try again." }, { status: 401 });
    }

    await createSession(user.id);
    return Response.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
    });
  } catch (error) {
    console.error("login failed", error);
    return Response.json({ error: "Couldn't sign you in just now. Try again shortly." }, { status: 503 });
  }
}
