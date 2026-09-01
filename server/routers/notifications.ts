import { and, count, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { auditLogs, notifications } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

export const notificationsRouter = router({
  list: workspaceProcedure.input(workspaceInput.extend({ unreadOnly: z.boolean().default(false), limit: z.number().int().min(1).max(100).default(30) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const conditions = [eq(notifications.workspaceId, ctx.workspaceId), eq(notifications.recipientUserId, ctx.user.id)];
    if (input.unreadOnly) conditions.push(isNull(notifications.readAt));
    return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(input.limit);
  }),

  markRead: workspaceProcedure.input(workspaceInput.extend({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const notification = (await db.select().from(notifications).where(and(eq(notifications.id, input.notificationId), eq(notifications.workspaceId, ctx.workspaceId), eq(notifications.recipientUserId, ctx.user.id))).limit(1))[0];
    if (!notification) throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found." });
    await db.update(notifications).set({ readAt: notification.readAt ?? new Date() }).where(eq(notifications.id, input.notificationId));
    return { success: true };
  }),

  markAllRead: workspaceProcedure.input(workspaceInput).mutation(async ({ ctx }) => {
    const db = await requireDb();
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.workspaceId, ctx.workspaceId), eq(notifications.recipientUserId, ctx.user.id), isNull(notifications.readAt)));
    return { success: true };
  }),
});

export const auditRouter = router({
  list: workspaceManagerProcedure.input(workspaceInput.extend({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const offset = (input.page - 1) * input.pageSize;
    const [items, totalResult] = await Promise.all([
      db.select().from(auditLogs).where(eq(auditLogs.workspaceId, ctx.workspaceId)).orderBy(desc(auditLogs.createdAt)).limit(input.pageSize).offset(offset),
      db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.workspaceId, ctx.workspaceId)),
    ]);
    return { items, total: Number(totalResult[0]?.value ?? 0), page: input.page, pageSize: input.pageSize };
  }),
});
