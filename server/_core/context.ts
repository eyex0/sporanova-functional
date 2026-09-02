import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserFromSession } from "../auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  apiKeyAuth?: {
    keyId: number;
    workspaceId: number;
    userId: number;
    scopes: string[];
    rateLimit: number;
  };
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const user = await getUserFromSession(opts.req.headers.cookie);

  if (user) {
    return { req: opts.req, res: opts.res, user };
  }

  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token.startsWith("sk_live_")) {
      const { validateApiKey } = await import("./apiKeys");
      const keyData = await validateApiKey(token);
      if (keyData) {
        const { requireDb } = await import("../db");
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await requireDb();
        const [apiKeyUser] = await db.select().from(users).where(eq(users.id, keyData.userId)).limit(1);
        return {
          req: opts.req,
          res: opts.res,
          user: apiKeyUser ?? null,
          apiKeyAuth: keyData,
        };
      }
    }
  }

  return { req: opts.req, res: opts.res, user: null };
}
