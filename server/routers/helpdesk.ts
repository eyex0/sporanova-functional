import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ticketMessages, tickets } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const listInput = workspaceInput.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["new", "open", "pending", "on_hold", "resolved", "closed"]).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

const createInput = workspaceInput.extend({
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(8000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  source: z.string().trim().max(80).optional(),
  requesterEmail: z.string().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  requesterName: z.string().trim().max(160).optional(),
  assigneeId: z.number().int().positive().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  initialMessage: z.string().trim().min(1).max(8000).optional(),
});

const updateInput = workspaceInput.extend({
  ticketId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(255).optional(),
  status: z.enum(["new", "open", "pending", "on_hold", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

const idInput = workspaceInput.extend({ ticketId: z.number().int().positive() });

const messageInput = workspaceInput.extend({
  ticketId: z.number().int().positive(),
  content: z.string().trim().min(1).max(8000),
  role: z.enum(["customer", "agent", "system", "note"]).default("agent"),
});

export const helpdeskRouter = router({
  listTickets: workspaceProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const where = and(
      eq(tickets.workspaceId, ctx.workspaceId),
      input.status ? eq(tickets.status, input.status) : undefined,
      input.assigneeId !== undefined ? input.assigneeId === null ? sql`${tickets.assigneeId} IS NULL` : eq(tickets.assigneeId, input.assigneeId) : undefined,
      input.search ? sql`(${tickets.subject} ILIKE ${`%${input.search}%`} OR ${tickets.requesterEmail} ILIKE ${`%${input.search}%`} OR ${tickets.requesterName} ILIKE ${`%${input.search}%`})` : undefined,
    );
    const [rows, [{ totalCount } = { totalCount: 0 }]] = await Promise.all([
      db.select().from(tickets).where(where).orderBy(desc(tickets.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ totalCount: sql<number>`count(*)::int` }).from(tickets).where(where),
    ]);
    return { items: rows, total: Number(totalCount), page: input.page, pageSize: input.pageSize };
  }),

  getTicket: workspaceProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(tickets).where(and(eq(tickets.workspaceId, ctx.workspaceId), eq(tickets.id, input.ticketId)));
    return row ?? null;
  }),

  listMessages: workspaceProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    return db.select().from(ticketMessages).where(and(eq(ticketMessages.workspaceId, ctx.workspaceId), eq(ticketMessages.ticketId, input.ticketId))).orderBy(ticketMessages.createdAt).limit(500);
  }),

  createTicket: workspaceMemberProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [ticket] = await db.insert(tickets).values({
      workspaceId: ctx.workspaceId,
      subject: input.subject,
      description: input.description,
      priority: input.priority,
      source: input.source ?? "dashboard",
      requesterEmail: input.requesterEmail ?? null,
      requesterName: input.requesterName ?? null,
      assigneeId: input.assigneeId ?? null,
      tags: input.tags ?? [],
      createdById: ctx.user.id,
    }).returning();
    if (ticket && input.initialMessage) {
      await db.insert(ticketMessages).values({
        ticketId: ticket.id,
        workspaceId: ctx.workspaceId,
        authorUserId: ctx.user.id,
        authorName: input.requesterName ?? ctx.user.name ?? "Customer",
        role: "customer",
        content: input.initialMessage,
      });
    }
    return ticket;
  }),

  updateTicket: workspaceMemberProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { ticketId, ...patch } = input;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.subject !== undefined) updateValues.subject = patch.subject;
    if (patch.status !== undefined) {
      updateValues.status = patch.status;
      if (patch.status === "resolved") updateValues.resolvedAt = new Date();
    }
    if (patch.priority !== undefined) updateValues.priority = patch.priority;
    if (patch.assigneeId !== undefined) updateValues.assigneeId = patch.assigneeId;
    if (patch.tags !== undefined) updateValues.tags = patch.tags;
    const [row] = await db.update(tickets).set(updateValues).where(and(eq(tickets.workspaceId, ctx.workspaceId), eq(tickets.id, ticketId))).returning();
    return row ?? null;
  }),

  addMessage: workspaceMemberProcedure.input(messageInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const ticket = (await db.select().from(tickets).where(and(eq(tickets.id, input.ticketId), eq(tickets.workspaceId, ctx.workspaceId))).limit(1))[0];
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found in this workspace." });
    const [row] = await db.insert(ticketMessages).values({
      ticketId: input.ticketId,
      workspaceId: ctx.workspaceId,
      authorUserId: ctx.user.id,
      authorName: ctx.user.name ?? "Agent",
      role: input.role,
      content: input.content,
    }).returning();
    await db.update(tickets).set({ updatedAt: new Date() }).where(and(eq(tickets.id, input.ticketId), eq(tickets.workspaceId, ctx.workspaceId)));
    return row;
  }),

  deleteTicket: workspaceManagerProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.delete(tickets).where(and(eq(tickets.workspaceId, ctx.workspaceId), eq(tickets.id, input.ticketId))).returning({ id: tickets.id });
    return row ?? null;
  }),

  listInboxes: workspaceProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const statusCounts = await db.select({ status: tickets.status, total: count() }).from(tickets).where(eq(tickets.workspaceId, ctx.workspaceId)).groupBy(tickets.status);
    const counts = Object.fromEntries(statusCounts.map(s => [s.status, Number(s.total)]));
    return {
      inboxes: [
        { key: "all", label: "All", count: Object.values(counts).reduce((a, b) => a + b, 0) },
        { key: "new", label: "New", count: counts["new"] ?? 0 },
        { key: "open", label: "Open", count: counts["open"] ?? 0 },
        { key: "pending", label: "Pending", count: counts["pending"] ?? 0 },
        { key: "on_hold", label: "On hold", count: counts["on_hold"] ?? 0 },
        { key: "resolved", label: "Resolved", count: counts["resolved"] ?? 0 },
        { key: "closed", label: "Closed", count: counts["closed"] ?? 0 },
        { key: "unassigned", label: "Unassigned", count: 0 },
        { key: "assigned_to_me", label: "Assigned to me", count: 0 },
      ],
    };
  }),
});
