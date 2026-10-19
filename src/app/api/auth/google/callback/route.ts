import { cookies } from "next/headers";
import { createSession, OAUTH_STATE_COOKIE, upsertGoogleUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type GoogleTokenResponse = { access_token?: string; id_token?: string; error?: string };
type GoogleUserInfo = { sub?: string; email?: string; name?: string; picture?: string; email_verified?: boolean };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const jar = await cookies();
  const rawCookie = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  let next = "/chat";
  let expectedState: string | null = null;
  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie) as { state?: string; next?: string };
      expectedState = parsed.state ?? null;
      next = parsed.next ?? "/chat";
    } catch {
      // ignore malformed cookie
    }
  }

  const failUrl = new URL("/login", url.origin);
  failUrl.searchParams.set("next", next);

  if (errorParam || !code || !state || !expectedState || state !== expectedState) {
    failUrl.searchParams.set("error", "google_failed");
    return Response.redirect(failUrl, 302);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token) {
      failUrl.searchParams.set("error", "google_failed");
      return Response.redirect(failUrl, 302);
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userInfoResponse.ok) {
      failUrl.searchParams.set("error", "google_failed");
      return Response.redirect(failUrl, 302);
    }
    const profile = (await userInfoResponse.json()) as GoogleUserInfo;
    if (!profile.sub || !profile.email) {
      failUrl.searchParams.set("error", "google_failed");
      return Response.redirect(failUrl, 302);
    }

    const user = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name ?? profile.email.split("@")[0],
      avatarUrl: profile.picture ?? null,
    });

    await createSession(user.id);

    const successUrl = new URL(next.startsWith("/") ? next : "/chat", url.origin);
    return Response.redirect(successUrl, 302);
  } catch (error) {
    console.error("google oauth failed", error);
    failUrl.searchParams.set("error", "google_failed");
    return Response.redirect(failUrl, 302);
  }
}
