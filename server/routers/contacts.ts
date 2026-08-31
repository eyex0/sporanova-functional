import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { contacts } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const listInput = workspaceInput.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["active", "unsubscribed", "blocked"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

const createInput = workspaceInput.extend({
  name: z.string().trim().min(1).max(160),
  email: z.string().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(64).optional(),
  company: z.string().trim().max(160).optional(),
  jobTitle: z.string().trim().max(160).optional(),
  source: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInput = workspaceInput.extend({
  contactId: z.number().int().positive(),
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  jobTitle: z.string().trim().max(160).nullable().optional(),
  status: z.enum(["active", "unsubscribed", "blocked"]).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

const idInput = workspaceInput.extend({ contactId: z.number().int().positive() });

export const contactsRouter = router({
  list: workspaceProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const where = and(
      eq(contacts.workspaceId, ctx.workspaceId),
      isNull(contacts.deletedAt),
      input.status ? eq(contacts.status, input.status) : undefined,
      input.search ? sql`(${contacts.name} ILIKE ${`%${input.search}%`} OR ${contacts.email} ILIKE ${`%${input.search}%`} OR ${contacts.company} ILIKE ${`%${input.search}%`})` : undefined,
    );
    const [rows, [{ count } = { count: 0 }]] = await Promise.all([
      db.select().from(contacts).where(where).orderBy(desc(contacts.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(where),
    ]);
    return { items: rows, total: Number(count), page: input.page, pageSize: input.pageSize };
  }),

  get: workspaceProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(contacts).where(and(eq(contacts.workspaceId, ctx.workspaceId), eq(contacts.id, input.contactId), isNull(contacts.deletedAt)));
    return row ?? null;
  }),

  create: workspaceMemberProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.insert(contacts).values({
      workspaceId: ctx.workspaceId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      jobTitle: input.jobTitle ?? null,
      source: input.source ?? "manual",
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      createdById: ctx.user.id,
    }).returning();
    return row;
  }),

  update: workspaceMemberProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { contactId, ...patch } = input;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) updateValues.name = patch.name;
    if (patch.email !== undefined) updateValues.email = patch.email;
    if (patch.phone !== undefined) updateValues.phone = patch.phone;
    if (patch.company !== undefined) updateValues.company = patch.company;
    if (patch.jobTitle !== undefined) updateValues.jobTitle = patch.jobTitle;
    if (patch.status !== undefined) updateValues.status = patch.status;
    if (patch.tags !== undefined) updateValues.tags = patch.tags;
    const [row] = await db.update(contacts).set(updateValues).where(and(eq(contacts.workspaceId, ctx.workspaceId), eq(contacts.id, contactId), isNull(contacts.deletedAt))).returning();
    return row ?? null;
  }),

  delete: workspaceManagerProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.update(contacts).set({ deletedAt: new Date(), status: "blocked" }).where(and(eq(contacts.workspaceId, ctx.workspaceId), eq(contacts.id, input.contactId), isNull(contacts.deletedAt))).returning({ id: contacts.id });
    return row ?? null;
  }),

  import: workspaceMemberProcedure.input(workspaceInput.extend({ items: z.array(createInput.omit({ workspaceId: true })).min(1).max(500) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const rows = input.items.map(item => ({
      workspaceId: ctx.workspaceId,
      name: item.name,
      email: item.email ?? null,
      phone: item.phone ?? null,
      company: item.company ?? null,
      jobTitle: item.jobTitle ?? null,
      source: item.source ?? "import",
      tags: item.tags ?? [],
      metadata: item.metadata ?? {},
      createdById: ctx.user.id,
    }));
    const inserted = await db.insert(contacts).values(rows).returning();
    return { imported: inserted.length };
  }),

  export: workspaceProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const rows = await db.select().from(contacts).where(and(eq(contacts.workspaceId, ctx.workspaceId), isNull(contacts.deletedAt))).orderBy(desc(contacts.createdAt));
    const header = "id,name,email,phone,company,jobTitle,status,source,createdAt";
    const csv = [header, ...rows.map(r => [r.id, JSON.stringify(r.name), JSON.stringify(r.email ?? ""), JSON.stringify(r.phone ?? ""), JSON.stringify(r.company ?? ""), JSON.stringify(r.jobTitle ?? ""), r.status, r.source, r.createdAt.toISOString()].join(","))].join("\n");
    return { csv, count: rows.length };
  }),
});
