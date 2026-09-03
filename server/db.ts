import { and, asc, eq, isNull, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { nanoid } from "nanoid";
import {
  auditLogs,
  authSessions,
  memberships,
  organizations,
  userPreferences,
  users,
  workspaces,
  type InsertUser,
} from "../drizzle/schema";

let connection: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!connection && process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    connection = drizzle(client);
  }
  return connection;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database service is unavailable");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Partial<InsertUser> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field];
      updateSet[field] = user[field];
    }
  }
  values.role = user.role ?? "user";
  updateSet.role = values.role;

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0];
}

export async function validateSession(token: string) {
  const db = await requireDb();
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await db
    .select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  if (!result[0]) return null;
  return { user: result[0].user, session: result[0].session };
}

export async function getActiveMembership(workspaceId: number, userId: number) {
  const db = await requireDb();
  return (
    await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId), eq(memberships.isActive, true)))
      .limit(1)
  )[0];
}

export async function getWorkspaceContext(workspaceId: number) {
  const db = await requireDb();
  return (
    await db
      .select({ workspace: workspaces, organization: organizations })
      .from(workspaces)
      .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
      .where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deletedAt), isNull(organizations.deletedAt)))
      .limit(1)
  )[0];
}

export async function listWorkspacesForUser(userId: number) {
  const db = await requireDb();
  return db
    .select({ workspace: workspaces, organization: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.isActive, true), isNull(workspaces.deletedAt), isNull(organizations.deletedAt)));
}

export async function listWorkspaceMembers(workspaceId: number) {
  const db = await requireDb();
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: memberships.role,
      isActive: memberships.isActive,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.isActive, true)))
    .orderBy(asc(memberships.createdAt));
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
  return base || "workspace";
}

export async function bootstrapWorkspace(user: { id: number; name?: string | null; email?: string | null }, organizationNameOverride?: string | null) {
  const existing = await listWorkspacesForUser(user.id);
  if (existing.length > 0) return existing;

  const db = await requireDb();
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "My Organization";
  const suffix = nanoid(6).toLowerCase();
  const organizationName = organizationNameOverride?.trim() || `${displayName}'s Organization`;
  const [organization] = await db.insert(organizations).values({
    name: organizationName,
    slug: `${slugify(displayName)}-${suffix}`,
    createdById: user.id,
  }).returning({ id: organizations.id });
  const [workspace] = await db.insert(workspaces).values({
    organizationId: organization.id,
    name: organizationName === `${displayName}'s Organization` ? "Main workspace" : `${organizationName} workspace`,
    slug: "main",
    isDefault: true,
    createdById: user.id,
  }).returning({ id: workspaces.id });
  await db.insert(memberships).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });
  await db.insert(userPreferences).values({ workspaceId: workspace.id, userId: user.id });
  return listWorkspacesForUser(user.id);
}

export async function writeAuditLog(input: {
  workspaceId: number;
  actorUserId: number | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  metadata?: Record<string, unknown>;
}) {
  const context = await getWorkspaceContext(input.workspaceId);
  if (!context) return;
  const db = await requireDb();
  await db.insert(auditLogs).values({
    organizationId: context.organization.id,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId === undefined || input.resourceId === null ? null : String(input.resourceId),
    metadata: input.metadata,
  });
}
