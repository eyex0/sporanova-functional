import { and, eq, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { parse } from "cookie";
import { authSessions, passwordResetTokens, users, type User } from "../drizzle/schema";
import { requireDb } from "./db";
import { sendEmail } from "./email";
import { ENV } from "./_core/env";

export const SESSION_COOKIE = "sopranova_session";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function registerWithPassword(input: { email: string; password: string; name: string }) {
  const db = await requireDb();
  const email = input.email.trim().toLowerCase();
  const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) throw new Error("EMAIL_ALREADY_REGISTERED");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [row] = await db.insert(users).values({
    openId: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash,
    loginMethod: "credentials",
    authProvider: "credentials",
    role: "user",
    lastSignedIn: new Date(),
  }).returning({ id: users.id });
  const id = row.id;
  const user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  if (!user) throw new Error("USER_CREATION_FAILED");
  return user;
}

export async function authenticateWithPassword(emailInput: string, password: string) {
  const db = await requireDb();
  const email = emailInput.trim().toLowerCase();
  const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return user;
}

export async function requestPasswordReset(emailInput: string) {
  const db = await requireDb();
  const email = emailInput.trim().toLowerCase();
  const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user?.email) return { accepted: true } as const;

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: tokenHash(rawToken), expiresAt });
  const resetUrl = `${ENV.appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your SOPRANOVA password",
    text: `Use this link to reset your password (expires in 30 minutes): ${resetUrl}`,
  });
  return { accepted: true } as const;
}

export async function resetPassword(rawToken: string, password: string) {
  const db = await requireDb();
  const token = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash(rawToken)), gt(passwordResetTokens.expiresAt, new Date()), isNull(passwordResetTokens.usedAt))).limit(1))[0];
  if (!token) throw new Error("INVALID_RESET_TOKEN");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash, authProvider: "credentials", loginMethod: "credentials" }).where(eq(users.id, token.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, token.id));
  await db.delete(authSessions).where(eq(authSessions.userId, token.userId));
  return { success: true } as const;
}

export async function createSession(userId: number) {
  const db = await requireDb();
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + ENV.sessionDays * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ id: randomUUID(), userId, tokenHash: tokenHash(token), expiresAt });
  return { token, expiresAt };
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const db = await requireDb();
  await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash(token)));
}

export async function getUserFromSession(cookieHeader: string | undefined) {
  const token = cookieHeader ? parse(cookieHeader)[SESSION_COOKIE] : undefined;
  if (!token) return null;
  const db = await requireDb();
  const result = await db
    .select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, tokenHash(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  if (!result[0]) return null;
  await db.update(authSessions).set({ lastUsedAt: new Date() }).where(eq(authSessions.id, result[0].session.id));
  return result[0].user;
}

export function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax" as const,
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : { maxAge: 0 }),
  };
}
