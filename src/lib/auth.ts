import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export const SESSION_COOKIE = "clintoy_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const OAUTH_STATE_COOKIE = "clintoy_oauth_state";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  authProvider: string;
};

function toSessionUser(row: User): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    authProvider: row.authProvider,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const token = await createSessionToken(userId);
  try {
    const jar = await cookies();
    jar.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } catch {
    // called outside a request/response context
  }
}

export async function clearSession() {
  try {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
  } catch {
    // ignore
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) return null;
    void db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId)).catch(() => undefined);
    return toSessionUser(row);
  } catch {
    return null;
  }
}

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function findUserByGoogleId(googleId: string) {
  const [row] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  return row ?? null;
}

export async function createUserWithPassword(email: string, password: string, displayName: string) {
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: displayName.trim().slice(0, 40) || "Friend",
      authProvider: "password",
    })
    .returning();
  return row;
}

export async function upsertGoogleUser(params: {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const existingByGoogle = await findUserByGoogleId(params.googleId);
  if (existingByGoogle) {
    const [updated] = await db
      .update(users)
      .set({ lastSeenAt: new Date(), avatarUrl: params.avatarUrl ?? existingByGoogle.avatarUrl })
      .where(eq(users.id, existingByGoogle.id))
      .returning();
    return updated;
  }

  const existingByEmail = await findUserByEmail(params.email);
  if (existingByEmail) {
    const [linked] = await db
      .update(users)
      .set({
        googleId: params.googleId,
        avatarUrl: params.avatarUrl ?? existingByEmail.avatarUrl,
        lastSeenAt: new Date(),
      })
      .where(eq(users.id, existingByEmail.id))
      .returning();
    return linked;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: params.email.trim().toLowerCase(),
      displayName: params.displayName.trim().slice(0, 40) || "Friend",
      avatarUrl: params.avatarUrl,
      authProvider: "google",
      googleId: params.googleId,
    })
    .returning();
  return created;
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Resolves the public-facing origin for building OAuth redirect URIs.
 * `request.url` can reflect an internal proxy address (e.g. http://0.0.0.0:3000)
 * when the app sits behind a reverse proxy that doesn't rewrite the Host header,
 * so we prefer an explicit site URL, then forwarded headers, then request.url.
 */
export function getPublicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const requestUrl = new URL(request.url);

  if (!forwardedHost) return requestUrl.origin;

  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(forwardedHost);
  if (isLocal) return `${requestUrl.protocol}//${forwardedHost}`;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
  return `${protocol}://${forwardedHost}`;
}

export function toSession(row: User) {
  return toSessionUser(row);
}
