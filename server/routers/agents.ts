import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { agentRuns, agents } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { enqueueJob } from "../jobs";
import { router } from "../_core/trpc";

const workspaceIdInput = z.object({ workspaceId: z.number().int().positive() });

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((item): item is { type: "text"; text: string } => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === "text" && "text" in item && typeof (item as { text?: unknown }).text === "string")
      .map(item => item.text)
      .join("\n");
  }
  return "";
}

async function workspaceAgent(workspaceId: number, agentId: number) {
  const db = await requireDb();
  const agent = (await db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt))).limit(1))[0];
  if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found in this workspace." });
  return agent;
}

export const agentsRouter = router({
  list: workspaceProcedure.input(workspaceIdInput.extend({ status: z.enum(["active", "idle", "paused", "error"]).optional() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const conditions = [eq(agents.workspaceId, ctx.workspaceId), isNull(agents.deletedAt)];
    if (input.status) conditions.push(eq(agents.status, input.status));
    return db.select().from(agents).where(and(...conditions)).orderBy(desc(agents.updatedAt));
  }),

  get: workspaceProcedure.input(workspaceIdInput.extend({ agentId: z.number().int().positive() })).query(({ ctx, input }) => workspaceAgent(ctx.workspaceId, input.agentId)),

  create: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ name: z.string().trim().min(2).max(160), purpose: z.string().trim().min(4).max(2000), description: z.string().trim().max(4000).optional(), capabilities: z.array(z.string().trim().min(1).max(80)).max(20).default([]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const created = await db.insert(agents).values({ workspaceId: ctx.workspaceId, name: input.name, purpose: input.purpose, description: input.description, capabilities: input.capabilities, createdById: ctx.user.id }).returning({ id: agents.id });
      const id = created[0].id;
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "agent.created", resourceType: "agent", resourceId: id });
      return workspaceAgent(ctx.workspaceId, id);
    }),

  setStatus: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ agentId: z.number().int().positive(), status: z.enum(["active", "idle", "paused"]) }))
    .mutation(async ({ ctx, input }) => {
      await workspaceAgent(ctx.workspaceId, input.agentId);
      const db = await requireDb();
      await db.update(agents).set({ status: input.status, lastActivityAt: new Date() }).where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, ctx.workspaceId)));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: `agent.status_${input.status}`, resourceType: "agent", resourceId: input.agentId });
      return { success: true };
    }),

  runs: workspaceProcedure.input(workspaceIdInput.extend({ agentId: z.number().int().positive(), pageSize: z.number().int().min(1).max(50).default(20) })).query(async ({ ctx, input }) => {
    await workspaceAgent(ctx.workspaceId, input.agentId);
    const db = await requireDb();
    return db.select().from(agentRuns).where(and(eq(agentRuns.workspaceId, ctx.workspaceId), eq(agentRuns.agentId, input.agentId))).orderBy(desc(agentRuns.createdAt)).limit(input.pageSize);
  }),

  runNow: workspaceMemberProcedure
    .input(workspaceIdInput.extend({ agentId: z.number().int().positive(), instruction: z.string().trim().min(3).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const agent = await workspaceAgent(ctx.workspaceId, input.agentId);
      const db = await requireDb();
      const runInsert = await db.insert(agentRuns).values({ workspaceId: ctx.workspaceId, agentId: agent.id, status: "pending", triggerType: "manual", progress: 0, input: { instruction: input.instruction }, createdById: ctx.user.id }).returning({ id: agentRuns.id });
      const runId = runInsert[0].id;
      await enqueueJob({ workspaceId: ctx.workspaceId, type: "agent.run", payload: { runId, agentId: agent.id, workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, instruction: input.instruction } });
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "agent.run_queued", resourceType: "agentRun", resourceId: runId, metadata: { agentId: agent.id } });
      return { id: runId, status: "pending" as const, content: "The agent run was queued for the SOPRANOVA worker." };
    }),
});
