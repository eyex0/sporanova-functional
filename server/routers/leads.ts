import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { contacts, leads } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const listInput = workspaceInput.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

const createInput = workspaceInput.extend({
  name: z.string().trim().min(1).max(160),
  email: z.string().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(64).optional(),
  company: z.string().trim().max(160).optional(),
  source: z.string().trim().max(80).optional(),
  value: z.number().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional(),
  assignedToId: z.number().int().positive().optional(),
});

const updateInput = workspaceInput.extend({
  leadId: z.number().int().positive(),
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  value: z.number().nonnegative().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
});

const idInput = workspaceInput.extend({ leadId: z.number().int().positive() });

export const leadsRouter = router({
  list: workspaceProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const where = and(
      eq(leads.workspaceId, ctx.workspaceId),
      isNull(leads.deletedAt),
      input.status ? eq(leads.status, input.status) : undefined,
      input.search ? sql`(${leads.name} ILIKE ${`%${input.search}%`} OR ${leads.email} ILIKE ${`%${input.search}%`} OR ${leads.company} ILIKE ${`%${input.search}%`})` : undefined,
    );
    const [rows, [{ count } = { count: 0 }]] = await Promise.all([
      db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(leads).where(where),
    ]);
    return { items: rows.map(r => ({ ...r, value: Number(r.value) })), total: Number(count), page: input.page, pageSize: input.pageSize };
  }),

  get: workspaceProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(leads).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, input.leadId), isNull(leads.deletedAt)));
    if (!row) return null;
    return { ...row, value: Number(row.value) };
  }),

  create: workspaceMemberProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.insert(leads).values({
      workspaceId: ctx.workspaceId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      source: input.source ?? "manual",
      value: String(input.value ?? 0),
      notes: input.notes ?? null,
      assignedToId: input.assignedToId ?? null,
      createdById: ctx.user.id,
    }).returning();
    return row ? { ...row, value: Number(row.value) } : null;
  }),

  update: workspaceMemberProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { leadId, value, ...patch } = input;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) updateValues.name = patch.name;
    if (patch.email !== undefined) updateValues.email = patch.email;
    if (patch.phone !== undefined) updateValues.phone = patch.phone;
    if (patch.company !== undefined) updateValues.company = patch.company;
    if (patch.status !== undefined) updateValues.status = patch.status;
    if (patch.notes !== undefined) updateValues.notes = patch.notes;
    if (patch.assignedToId !== undefined) updateValues.assignedToId = patch.assignedToId;
    if (value !== undefined) updateValues.value = String(value);
    const [row] = await db.update(leads).set(updateValues).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, leadId), isNull(leads.deletedAt))).returning();
    return row ? { ...row, value: Number(row.value) } : null;
  }),

  delete: workspaceManagerProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.update(leads).set({ deletedAt: new Date() }).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, input.leadId), isNull(leads.deletedAt))).returning({ id: leads.id });
    return row ?? null;
  }),

  convert: workspaceMemberProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [lead] = await db.select().from(leads).where(and(eq(leads.workspaceId, ctx.workspaceId), eq(leads.id, input.leadId), isNull(leads.deletedAt)));
    if (!lead) throw new Error("Lead not found");
    const [contact] = await db.insert(contacts).values({
      workspaceId: ctx.workspaceId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: `lead:${lead.source}`,
      tags: ["converted-lead"],
      createdById: ctx.user.id,
    }).returning();
    await db.update(leads).set({ status: "converted", convertedToContactId: contact.id, updatedAt: new Date() }).where(eq(leads.id, lead.id));
    return { contactId: contact.id };
  }),

  export: workspaceProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const rows = await db.select().from(leads).where(and(eq(leads.workspaceId, ctx.workspaceId), isNull(leads.deletedAt))).orderBy(desc(leads.createdAt));
    const header = "id,name,email,phone,company,status,value,source,createdAt";
    const csv = [header, ...rows.map(r => [r.id, JSON.stringify(r.name), JSON.stringify(r.email ?? ""), JSON.stringify(r.phone ?? ""), JSON.stringify(r.company ?? ""), r.status, r.value, r.source, r.createdAt.toISOString()].join(","))].join("\n");
    return { csv, count: rows.length };
  }),
});
