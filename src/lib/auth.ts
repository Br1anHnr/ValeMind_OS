import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hasPermission, type AuthUser, type Permission } from "@/lib/permissions";

export const SESSION_COOKIE_NAME = "valemind_session";
const SESSION_DURATION_DAYS = 14;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET inválida ou não configurada no .env");
  }
  return secret;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function signToken(rawToken: string): string {
  const sig = createHmac("sha256", getAuthSecret()).update(rawToken).digest("hex");
  return `${rawToken}.${sig}`;
}

function verifySignedToken(signedValue: string): string | null {
  const dotIndex = signedValue.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const rawToken = signedValue.slice(0, dotIndex);
  const sig = signedValue.slice(dotIndex + 1);
  const expectedSig = createHmac("sha256", getAuthSecret())
    .update(rawToken)
    .digest("hex");

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;

  return timingSafeEqual(sigBuf, expectedBuf) ? rawToken : null;
}

export async function createSession(userId: string): Promise<void> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signToken(rawToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const signedCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (signedCookie) {
    const rawToken = verifySignedToken(signedCookie);
    if (rawToken) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(rawToken)));
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const signedCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!signedCookie) return null;

  const rawToken = verifySignedToken(signedCookie);
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
        eq(users.active, true)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function requireUser(permission?: Permission): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (permission && !hasPermission(user, permission)) {
    redirect("/");
  }
  return user;
}

export async function requireApiUser(permission?: Permission): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (permission && !hasPermission(user, permission)) return null;
  return user;
}
