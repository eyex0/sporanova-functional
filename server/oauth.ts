import type { Express } from "express";
import { and, eq, or } from "drizzle-orm";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { oauthAccounts, users } from "../drizzle/schema";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "./auth";
import { bootstrapWorkspace, requireDb } from "./db";
import { ENV } from "./_core/env";

type OAuthState = { nonce: string; createdAt: number; returnTo: string };

function encodeState(state: OAuthState) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = createHmac("sha256", ENV.sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function decodeState(value: string | undefined): OAuthState | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", ENV.sessionSecret).update(payload).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    if (!state.nonce || !state.returnTo.startsWith("/") || Date.now() - state.createdAt > 10 * 60 * 1000) return null;
    return state;
  } catch { return null; }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req, res) => {
    if (!ENV.oauth.googleClientId || !ENV.oauth.googleClientSecret) return res.status(503).json({ error: "Google OAuth is not configured." });
    const returnTo = typeof req.query.returnTo === "string" && req.query.returnTo.startsWith("/") ? req.query.returnTo : "/app/dashboard";
    const callback = `${ENV.appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.oauth.googleClientId);
    url.searchParams.set("redirect_uri", callback);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", encodeState({ nonce: randomBytes(18).toString("base64url"), createdAt: Date.now(), returnTo }));
    res.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const state = decodeState(typeof req.query.state === "string" ? req.query.state : undefined);
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    if (!state || !code || !ENV.oauth.googleClientId || !ENV.oauth.googleClientSecret) return res.status(400).send("Invalid OAuth callback.");
    try {
      const callback = `${ENV.appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: ENV.oauth.googleClientId, client_secret: ENV.oauth.googleClientSecret, redirect_uri: callback, grant_type: "authorization_code" }) });
      if (!tokenResponse.ok) throw new Error("Google token exchange failed");
      const token = await tokenResponse.json() as { access_token?: string };
      if (!token.access_token) throw new Error("Google did not return an access token");
      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (!profileResponse.ok) throw new Error("Google profile request failed");
      const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
      if (!profile.sub || !profile.email || !profile.email_verified) throw new Error("Google account does not expose a verified email");
      const db = await requireDb();
      const existingAccount = (await db.select().from(oauthAccounts).where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerAccountId, profile.sub))).limit(1))[0];
      let user = existingAccount ? (await db.select().from(users).where(eq(users.id, existingAccount.userId)).limit(1))[0] : undefined;
      if (!user) user = (await db.select().from(users).where(or(eq(users.email, profile.email.toLowerCase()), eq(users.openId, profile.sub))).limit(1))[0];
      if (!user) {
        const [insert] = await db.insert(users).values({ openId: profile.sub, email: profile.email.toLowerCase(), name: profile.name ?? profile.email.split("@")[0], avatarUrl: profile.picture, loginMethod: "google", authProvider: "google", role: "user", lastSignedIn: new Date() }).returning({ id: users.id });
        user = (await db.select().from(users).where(eq(users.id, insert.id)).limit(1))[0];
      }
      if (!user) throw new Error("Unable to create account");
      if (!existingAccount) await db.insert(oauthAccounts).values({ userId: user.id, provider: "google", providerAccountId: profile.sub });
      await db.update(users).set({ lastSignedIn: new Date(), name: user.name ?? profile.name, avatarUrl: user.avatarUrl ?? profile.picture, authProvider: "google" }).where(eq(users.id, user.id));
      await bootstrapWorkspace(user);
      const session = await createSession(user.id);
      res.cookie(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
      res.redirect(state.returnTo);
    } catch (error) {
      console.error(JSON.stringify({ event: "auth.google_callback_failed", error: error instanceof Error ? error.message : "unknown" }));
      res.status(500).send("Sign in could not be completed.");
    }
  });
}
