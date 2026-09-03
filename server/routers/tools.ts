import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tools, toolExecutions } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { router } from "../_core/trpc";

const workspaceIdInput = z.object({ workspaceId: z.number().int().positive() });

export const toolsRouter = router({
  list: workspaceProcedure
    .input(workspaceIdInput.extend({ enabled: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions = [eq(tools.workspaceId, ctx.workspaceId), isNull(tools.deletedAt)];
      if (input.enabled !== undefined) conditions.push(eq(tools.enabled, input.enabled));
      return db.select().from(tools).where(and(...conditions)).orderBy(desc(tools.createdAt));
    }),

  get: workspaceProcedure
    .input(workspaceIdInput.extend({ toolId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const tool = (
        await db.select().from(tools).where(and(eq(tools.id, input.toolId), eq(tools.workspaceId, ctx.workspaceId), isNull(tools.deletedAt))).limit(1)
      )[0];
      if (!tool) throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found." });
      return tool;
    }),

  create: workspaceManagerProcedure
    .input(workspaceIdInput.extend({
      name: z.string().trim().min(2).max(160).regex(/^[a-z0-9_]+$/, "Name must be lowercase alphanumeric with underscores"),
      description: z.string().trim().min(4).max(2000),
      parameters: z.record(z.unknown()).default({}),
      handlerType: z.enum(["builtin", "webhook", "code"]).default("builtin"),
      handlerConfig: z.record(z.unknown()).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select({ id: tools.id }).from(tools).where(and(eq(tools.workspaceId, ctx.workspaceId), eq(tools.name, input.name), isNull(tools.deletedAt))).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "A tool with this name already exists." });

      const created = await db.insert(tools).values({
        workspaceId: ctx.workspaceId,
        name: input.name,
        description: input.description,
        parameters: input.parameters,
        handlerType: input.handlerType,
        handlerConfig: input.handlerConfig,
        createdById: ctx.user.id,
      }).returning({ id: tools.id });

      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "tool.created", resourceType: "tool", resourceId: created[0].id });
      return db.select().from(tools).where(eq(tools.id, created[0].id)).limit(1).then(r => r[0]);
    }),

  update: workspaceManagerProcedure
    .input(workspaceIdInput.extend({
      toolId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160).regex(/^[a-z0-9_]+$/).optional(),
      description: z.string().trim().min(4).max(2000).optional(),
      parameters: z.record(z.unknown()).optional(),
      handlerConfig: z.record(z.unknown()).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { toolId, ...patch } = input;
      const tool = await db.select().from(tools).where(and(eq(tools.id, toolId), eq(tools.workspaceId, ctx.workspaceId), isNull(tools.deletedAt))).limit(1);
      if (!tool.length) throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found." });

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.name !== undefined) updateValues.name = patch.name;
      if (patch.description !== undefined) updateValues.description = patch.description;
      if (patch.parameters !== undefined) updateValues.parameters = patch.parameters;
      if (patch.handlerConfig !== undefined) updateValues.handlerConfig = patch.handlerConfig;
      if (patch.enabled !== undefined) updateValues.enabled = patch.enabled;

      await db.update(tools).set(updateValues).where(and(eq(tools.id, toolId), eq(tools.workspaceId, ctx.workspaceId)));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "tool.updated", resourceType: "tool", resourceId: toolId });
      return db.select().from(tools).where(eq(tools.id, toolId)).limit(1).then(r => r[0]);
    }),

  delete: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ toolId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const tool = await db.select().from(tools).where(and(eq(tools.id, input.toolId), eq(tools.workspaceId, ctx.workspaceId), isNull(tools.deletedAt))).limit(1);
      if (!tool.length) throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found." });

      await db.update(tools).set({ deletedAt: new Date() }).where(and(eq(tools.id, input.toolId), eq(tools.workspaceId, ctx.workspaceId)));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "tool.deleted", resourceType: "tool", resourceId: input.toolId });
      return { success: true };
    }),

  executions: workspaceProcedure
    .input(workspaceIdInput.extend({ agentId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions = [eq(toolExecutions.workspaceId, ctx.workspaceId)];
      if (input.agentId) conditions.push(eq(toolExecutions.agentId, input.agentId));
      return db.select().from(toolExecutions).where(and(...conditions)).orderBy(desc(toolExecutions.createdAt)).limit(input.limit);
    }),
});
