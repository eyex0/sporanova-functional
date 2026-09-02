import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, gt, desc } from "drizzle-orm";
import { apiKeys } from "../../drizzle/schema";
import { requireDb } from "../db";

const KEY_PREFIX = "sk_live_";
const KEY_BYTES = 32;

export function generateKeyString(): string {
  const raw = randomBytes(KEY_BYTES).toString("hex");
  return `${KEY_PREFIX}${raw}`;
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function getKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

export async function createApiKey(
  workspaceId: number,
  userId: number,
  name: string,
  scopes: string[] = ["*"],
  expiresInDays?: number,
  rateLimit: number = 60,
): Promise<{ id: number; key: string; keyPrefix: string }> {
  const db = await requireDb();
  const key = generateKeyString();
  const keyHash = hashKey(key);
  const keyPrefix = getKeyPrefix(key);
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [row] = await db
    .insert(apiKeys)
    .values({
      workspaceId,
      userId,
      name,
      keyPrefix,
      keyHash,
      scopes,
      rateLimit,
      expiresAt,
    })
    .returning({ id: apiKeys.id });

  return { id: row.id, key, keyPrefix };
}

export async function validateApiKey(rawKey: string) {
  const db = await requireDb();
  const keyHash = hashKey(rawKey);
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!row) return null;

  if (row.expiresAt && row.expiresAt < new Date()) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    scopes: row.scopes as string[],
    rateLimit: row.rateLimit,
  };
}

export async function listApiKeys(workspaceId: number) {
  const db = await requireDb();
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      rateLimit: apiKeys.rateLimit,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.workspaceId, workspaceId), eq(apiKeys.isActive, true)))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(keyId: number, workspaceId: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)))
    .returning({ id: apiKeys.id });
  return result.length > 0;
}

export async function getApiKeyById(keyId: number, workspaceId: number) {
  const db = await requireDb();
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}
