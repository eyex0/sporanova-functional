import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { workflowNodes, workflowRuns, workflows } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { enqueueJob } from "../jobs";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });
const nodeInput = z.object({
  nodeKey: z.string().trim().min(1).max(80),
  nodeType: z.enum(["trigger", "intelligence", "condition", "action"]),
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  positionX: z.number().int().min(-10000).max(10000).default(0),
  positionY: z.number().int().min(-10000).max(10000).default(0),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  configuration: z.record(z.string(), z.unknown()).optional(),
});

async function ensureWorkflow(workspaceId: number, workflowId: number) {
  const db = await requireDb();
  const workflow = (await db.select().from(workflows).where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId), isNull(workflows.deletedAt))).limit(1))[0];
  if (!workflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found in this workspace." });
  return workflow;
}

export const workflowsRouter = router({
  list: workspaceProcedure.input(workspaceInput).query(async ({ ctx }) => { const db = await requireDb(); return db.select().from(workflows).where(and(eq(workflows.workspaceId, ctx.workspaceId), isNull(workflows.deletedAt))).orderBy(desc(workflows.updatedAt)); }),
  get: workspaceProcedure.input(workspaceInput.extend({ workflowId: z.number().int().positive() })).query(async ({ ctx, input }) => { const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId); const db = await requireDb(); const nodes = await db.select().from(workflowNodes).where(eq(workflowNodes.workflowId, workflow.id)).orderBy(workflowNodes.sortOrder); return { workflow, nodes }; }),
  create: workspaceManagerProcedure.input(workspaceInput.extend({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(4000).optional(), nodes: z.array(nodeInput).min(1).max(50) })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const [workflowRow] = await db.insert(workflows).values({ workspaceId: ctx.workspaceId, name: input.name, description: input.description, createdById: ctx.user.id }).returning({ id: workflows.id }); const workflowId = workflowRow.id; await db.insert(workflowNodes).values(input.nodes.map(node => ({ workflowId, ...node }))); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workflow.created", resourceType: "workflow", resourceId: workflowId }); return { id: workflowId }; }),
  update: workspaceManagerProcedure.input(workspaceInput.extend({ workflowId: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), description: z.string().trim().max(4000).nullable().optional(), status: z.enum(["active", "paused", "draft", "archived"]).optional() })).mutation(async ({ ctx, input }) => { await ensureWorkflow(ctx.workspaceId, input.workflowId); const db = await requireDb(); const { workspaceId: _workspaceId, workflowId, ...changes } = input; await db.update(workflows).set(changes).where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, ctx.workspaceId))); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workflow.updated", resourceType: "workflow", resourceId: workflowId }); return { success: true }; }),
  runNow: workspaceMemberProcedure.input(workspaceInput.extend({ workflowId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId); if (workflow.status === "archived") throw new TRPCError({ code: "CONFLICT", message: "Archived workflows cannot be executed." }); const db = await requireDb(); const idempotencyKey = `manual:${workflow.id}:${ctx.user.id}:${randomUUID()}`.slice(0, 128); const [runRow] = await db.insert(workflowRuns).values({ workspaceId: ctx.workspaceId, workflowId: workflow.id, status: "pending", triggerType: "manual", idempotencyKey, createdById: ctx.user.id }).returning({ id: workflowRuns.id }); const runId = runRow.id; await enqueueJob({ workspaceId: ctx.workspaceId, type: "workflow.run", payload: { runId, workflowId: workflow.id, workspaceId: ctx.workspaceId } }); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workflow.run_queued", resourceType: "workflowRun", resourceId: runId, metadata: { workflowId: workflow.id } }); return { id: runId, status: "pending" as const }; }),
  runs: workspaceProcedure.input(workspaceInput.extend({ workflowId: z.number().int().positive(), pageSize: z.number().int().min(1).max(50).default(20) })).query(async ({ ctx, input }) => { await ensureWorkflow(ctx.workspaceId, input.workflowId); const db = await requireDb(); return db.select().from(workflowRuns).where(and(eq(workflowRuns.workspaceId, ctx.workspaceId), eq(workflowRuns.workflowId, input.workflowId))).orderBy(desc(workflowRuns.createdAt)).limit(input.pageSize); }),
});
