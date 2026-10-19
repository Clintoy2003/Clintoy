import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { isGoogleAuthConfigured, OAUTH_STATE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/chat";

  if (!isGoogleAuthConfigured()) {
    const redirect = new URL("/login", url.origin);
    redirect.searchParams.set("error", "google_not_configured");
    redirect.searchParams.set("next", next);
    return Response.redirect(redirect, 302);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set({
    name: OAUTH_STATE_COOKIE,
    value: JSON.stringify({ state, next }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return Response.redirect(authUrl.toString(), 302);
}
