import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { workflowNodes, workflowRuns, workflows, workflowEdges, nodeExecutions, workflowApprovals, workflowStepCheckpoints, workflowDeployments, workflowVersions } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { enqueueJob } from "../jobs";
import { router } from "../_core/trpc";
import { executeWorkflow, createWorkflowSnapshot, resolveApproval, loadCheckpoint } from "../_core/workflowEngine";

const nodeTypeEnum = z.enum([
  // Control flow
  "start", "end", "condition", "wait", "notification",
  // Agent & AI
  "ai", "ai_agent", "ai_router", "ai_classifier", "supervisor", "multi_agent",
  // Knowledge & Memory
  "knowledge_search", "rag_retrieval", "memory_read", "memory_write",
  // Tools
  "tool", "mcp_tool", "http_request", "function", "code",
  // Logic
  "parallel", "merge", "aggregate", "subworkflow",
  // Human & Approval
  "human_approval", "escalation", "approval",
  // Legacy aliases
  "trigger", "intelligence", "action", "api",
]);

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const nodeInput = z.object({
  nodeKey: z.string().trim().min(1).max(80),
  nodeType: nodeTypeEnum,
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  positionX: z.number().int().min(-10000).max(10000).default(0),
  positionY: z.number().int().min(-10000).max(10000).default(0),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  configuration: z.record(z.string(), z.unknown()).optional(),
});

const edgeInput = z.object({
  sourceNodeKey: z.string().trim().min(1).max(80),
  targetNodeKey: z.string().trim().min(1).max(80),
  label: z.string().trim().max(160).optional(),
  conditionExpr: z.string().max(2000).optional(),
});

async function ensureWorkflow(workspaceId: number, workflowId: number) {
  const db = await requireDb();
  const workflow = (await db.select().from(workflows).where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId), isNull(workflows.deletedAt))).limit(1))[0];
  if (!workflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found in this workspace." });
  return workflow;
}

export const workflowsRouter = router({
  list: workspaceProcedure
    .input(workspaceInput.extend({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      return db.select().from(workflows)
        .where(and(eq(workflows.workspaceId, ctx.workspaceId), isNull(workflows.deletedAt)))
        .orderBy(desc(workflows.updatedAt))
        .limit(input.limit);
    }),

  get: workspaceProcedure
    .input(workspaceInput.extend({ workflowId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();
      const nodes = await db.select().from(workflowNodes)
        .where(eq(workflowNodes.workflowId, workflow.id))
        .orderBy(workflowNodes.sortOrder);
      const edges = await db.select().from(workflowEdges)
        .where(eq(workflowEdges.workflowId, workflow.id));
      return { workflow, nodes, edges };
    }),

  create: workspaceManagerProcedure
    .input(workspaceInput.extend({
      name: z.string().trim().min(2).max(160),
      description: z.string().trim().max(4000).optional(),
      nodes: z.array(nodeInput).min(1).max(50),
      edges: z.array(edgeInput).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [workflowRow] = await db.insert(workflows).values({
        workspaceId: ctx.workspaceId,
        name: input.name,
        description: input.description,
        createdById: ctx.user.id,
      }).returning({ id: workflows.id });

      const workflowId = workflowRow.id;

      // Insert nodes and build key→id map
      const insertedNodes = await db.insert(workflowNodes)
        .values(input.nodes.map(node => ({ workflowId, ...node })))
        .returning({ id: workflowNodes.id, nodeKey: workflowNodes.nodeKey });

      const keyToId = new Map(insertedNodes.map(n => [n.nodeKey, n.id]));

      // Insert edges
      if (input.edges && input.edges.length > 0) {
        const validEdges = input.edges
          .filter(e => keyToId.has(e.sourceNodeKey) && keyToId.has(e.targetNodeKey))
          .map(e => ({
            workflowId,
            sourceNodeId: keyToId.get(e.sourceNodeKey)!,
            targetNodeId: keyToId.get(e.targetNodeKey)!,
            label: e.label,
            conditionExpr: e.conditionExpr,
          }));

        if (validEdges.length > 0) {
          await db.insert(workflowEdges).values(validEdges);
        }
      }

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workflow.created",
        resourceType: "workflow",
        resourceId: workflowId,
      });

      return { id: workflowId };
    }),

  update: workspaceManagerProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160).optional(),
      description: z.string().trim().max(4000).nullable().optional(),
      status: z.enum(["active", "paused", "draft", "archived"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();
      const { workspaceId: _workspaceId, workflowId, ...changes } = input;
      await db.update(workflows)
        .set(changes)
        .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, ctx.workspaceId)));

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workflow.updated",
        resourceType: "workflow",
        resourceId: workflowId,
      });

      return { success: true };
    }),

  updateNodes: workspaceManagerProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      nodes: z.array(nodeInput).min(1).max(50),
      edges: z.array(edgeInput).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();

      // Delete existing edges, then nodes
      await db.delete(workflowEdges).where(eq(workflowEdges.workflowId, workflow.id));
      await db.delete(workflowNodes).where(eq(workflowNodes.workflowId, workflow.id));

      // Re-insert nodes
      const insertedNodes = await db.insert(workflowNodes)
        .values(input.nodes.map(node => ({ workflowId: workflow.id, ...node })))
        .returning({ id: workflowNodes.id, nodeKey: workflowNodes.nodeKey });

      const keyToId = new Map(insertedNodes.map(n => [n.nodeKey, n.id]));

      // Re-insert edges
      if (input.edges.length > 0) {
        const validEdges = input.edges
          .filter(e => keyToId.has(e.sourceNodeKey) && keyToId.has(e.targetNodeKey))
          .map(e => ({
            workflowId: workflow.id,
            sourceNodeId: keyToId.get(e.sourceNodeKey)!,
            targetNodeId: keyToId.get(e.targetNodeKey)!,
            label: e.label,
            conditionExpr: e.conditionExpr,
          }));

        if (validEdges.length > 0) {
          await db.insert(workflowEdges).values(validEdges);
        }
      }

      // Update workflow timestamp
      await db.update(workflows)
        .set({ updatedAt: new Date() })
        .where(eq(workflows.id, workflow.id));

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workflow.nodes_updated",
        resourceType: "workflow",
        resourceId: workflow.id,
      });

      return { success: true };
    }),

  runNow: workspaceMemberProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      input: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
      if (workflow.status === "archived") {
        throw new TRPCError({ code: "CONFLICT", message: "Archived workflows cannot be executed." });
      }

      const db = await requireDb();
      const idempotencyKey = `manual:${workflow.id}:${ctx.user.id}:${randomUUID()}`.slice(0, 128);

      const [runRow] = await db.insert(workflowRuns).values({
        workspaceId: ctx.workspaceId,
        workflowId: workflow.id,
        status: "pending",
        triggerType: "manual",
        idempotencyKey,
        createdById: ctx.user.id,
      }).returning({ id: workflowRuns.id });

      const runId = runRow.id;

      // Execute synchronously (can be switched to async via worker)
      try {
        const result = await executeWorkflow(
          ctx.workspaceId,
          workflow.id,
          runId,
          ctx.user.id,
          input.input,
        );

        await writeAuditLog({
          workspaceId: ctx.workspaceId,
          actorUserId: ctx.user.id,
          action: "workflow.run_completed",
          resourceType: "workflowRun",
          resourceId: runId,
          metadata: { workflowId: workflow.id, status: result.status },
        });

        return {
          id: runId,
          status: result.status,
          outputs: result.outputs,
          nodeResults: result.nodeResults,
          durationMs: result.durationMs,
        };
      } catch (err) {
        await db.update(workflowRuns)
          .set({ status: "failed", errorMessage: String(err), completedAt: new Date() })
          .where(eq(workflowRuns.id, runId));

        return { id: runId, status: "failed" as const, error: String(err) };
      }
    }),

  enqueueRun: workspaceMemberProcedure
    .input(workspaceInput.extend({ workflowId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
      if (workflow.status === "archived") {
        throw new TRPCError({ code: "CONFLICT", message: "Archived workflows cannot be executed." });
      }

      const db = await requireDb();
      const idempotencyKey = `manual:${workflow.id}:${ctx.user.id}:${randomUUID()}`.slice(0, 128);

      const [runRow] = await db.insert(workflowRuns).values({
        workspaceId: ctx.workspaceId,
        workflowId: workflow.id,
        status: "pending",
        triggerType: "manual",
        idempotencyKey,
        createdById: ctx.user.id,
      }).returning({ id: workflowRuns.id });

      const runId = runRow.id;
      await enqueueJob({
        workspaceId: ctx.workspaceId,
        type: "workflow.run",
        payload: { runId, workflowId: workflow.id, workspaceId: ctx.workspaceId },
      });

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workflow.run_queued",
        resourceType: "workflowRun",
        resourceId: runId,
        metadata: { workflowId: workflow.id },
      });

      return { id: runId, status: "pending" as const };
    }),

  runs: workspaceProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();
      return db.select().from(workflowRuns)
        .where(and(
          eq(workflowRuns.workspaceId, ctx.workspaceId),
          eq(workflowRuns.workflowId, input.workflowId),
        ))
        .orderBy(desc(workflowRuns.createdAt))
        .limit(input.pageSize);
    }),

  runDetail: workspaceProcedure
    .input(workspaceInput.extend({ runId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const run = (await db.select().from(workflowRuns)
        .where(and(eq(workflowRuns.id, input.runId), eq(workflowRuns.workspaceId, ctx.workspaceId)))
        .limit(1))[0];
      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });

      const executions = await db.select().from(nodeExecutions)
        .where(eq(nodeExecutions.runId, run.id))
        .orderBy(nodeExecutions.createdAt);

      return { run, executions };
    }),

  snapshot: workspaceManagerProcedure
    .input(workspaceInput.extend({ workflowId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const versionId = await createWorkflowSnapshot(input.workflowId, ctx.user.id);
      return { versionId };
    }),

  // ──────── V2: Approvals ────────
  approvals: workspaceProcedure
    .input(workspaceInput.extend({
      status: z.enum(["pending", "approved", "rejected", "expired"]).optional(),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions = [eq(workflowApprovals.workspaceId, ctx.workspaceId)];
      if (input.status) conditions.push(eq(workflowApprovals.status, input.status));
      return db.select().from(workflowApprovals)
        .where(and(...conditions))
        .orderBy(desc(workflowApprovals.createdAt))
        .limit(input.pageSize);
    }),

  approveStep: workspaceManagerProcedure
    .input(workspaceInput.extend({
      approvalId: z.number().int().positive(),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().trim().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const approval = (await db.select().from(workflowApprovals)
        .where(and(
          eq(workflowApprovals.id, input.approvalId),
          eq(workflowApprovals.workspaceId, ctx.workspaceId),
        ))
        .limit(1))[0];

      if (!approval) throw new TRPCError({ code: "NOT_FOUND", message: "Approval not found." });
      if (approval.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Approval already resolved." });

      await resolveApproval(input.approvalId, ctx.user.id, input.decision, input.note);

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: `workflow.approval.${input.decision}`,
        resourceType: "workflowApproval",
        resourceId: input.approvalId,
        metadata: { runId: approval.runId, decision: input.decision },
      });

      // If approved, resume the workflow run
      if (input.decision === "approved") {
        const run = (await db.select().from(workflowRuns)
          .where(eq(workflowRuns.id, approval.runId))
          .limit(1))[0];

        if (run && run.status === "running") {
          // Resume execution
          await db.update(workflowRuns)
            .set({ status: "running" })
            .where(eq(workflowRuns.id, run.id));

          enqueueJob({
            workspaceId: ctx.workspaceId,
            type: "workflow.resume",
            payload: { runId: run.id, workflowId: run.workflowId, workspaceId: ctx.workspaceId },
          }).catch(() => {});
        }
      }

      return { success: true };
    }),

  // ──────── V2: Run Resume ────────
  resumeRun: workspaceMemberProcedure
    .input(workspaceInput.extend({ runId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const run = (await db.select().from(workflowRuns)
        .where(and(eq(workflowRuns.id, input.runId), eq(workflowRuns.workspaceId, ctx.workspaceId)))
        .limit(1))[0];

      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      if (run.status !== "running" && run.status !== "failed") {
        throw new TRPCError({ code: "CONFLICT", message: "Run cannot be resumed in its current status." });
      }

      // Load checkpoint
      const checkpoint = await loadCheckpoint(run.id, "");
      if (checkpoint) {
        await db.update(workflowRuns)
          .set({ status: "running" })
          .where(eq(workflowRuns.id, run.id));

        enqueueJob({
          workspaceId: ctx.workspaceId,
          type: "workflow.resume",
          payload: { runId: run.id, workflowId: run.workflowId, workspaceId: ctx.workspaceId },
        }).catch(() => {});

        return { success: true, status: "resumed" };
      }

      return { success: false, status: "no_checkpoint" };
    }),

  // ──────── V2: Deployments ────────
  deploy: workspaceManagerProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      changelog: z.string().trim().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();

      // Create a snapshot first
      const versionId = await createWorkflowSnapshot(input.workflowId, ctx.user.id);

      // Create deployment
      const [deployment] = await db.insert(workflowDeployments).values({
        workflowId: input.workflowId,
        workspaceId: ctx.workspaceId,
        versionId,
        status: "deployed",
        deployedById: ctx.user.id,
        changelog: input.changelog,
      }).returning({ id: workflowDeployments.id });

      // Archive any previous deployments
      await db.update(workflowDeployments)
        .set({ status: "superseded" })
        .where(and(
          eq(workflowDeployments.workflowId, input.workflowId),
          eq(workflowDeployments.status, "deployed"),
        ));

      // Activate the workflow
      await db.update(workflows)
        .set({ status: "active" })
        .where(eq(workflows.id, input.workflowId));

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workflow.deployed",
        resourceType: "workflow",
        resourceId: input.workflowId,
        metadata: { deploymentId: deployment.id, versionId },
      });

      return { deploymentId: deployment.id, versionId };
    }),

  deployments: workspaceProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();
      return db.select().from(workflowDeployments)
        .where(and(
          eq(workflowDeployments.workspaceId, ctx.workspaceId),
          eq(workflowDeployments.workflowId, input.workflowId),
        ))
        .orderBy(desc(workflowDeployments.createdAt))
        .limit(input.pageSize);
    }),

  // ──────── V2: Version History ────────
  versions: workspaceProcedure
    .input(workspaceInput.extend({
      workflowId: z.number().int().positive(),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      await ensureWorkflow(ctx.workspaceId, input.workflowId);
      const db = await requireDb();
      return db.select().from(workflowVersions)
        .where(eq(workflowVersions.workflowId, input.workflowId))
        .orderBy(desc(workflowVersions.version))
        .limit(input.pageSize);
    }),

  // ──────── V2: Validate ────────
  validate: workspaceProcedure
    .input(workspaceInput.extend({
      nodes: z.array(nodeInput).min(1).max(50),
      edges: z.array(edgeInput).max(100),
    }))
    .query(async ({ input }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for start node
      const hasStart = input.nodes.some(n => n.nodeType === "start" || n.nodeType === "trigger");
      if (!hasStart) errors.push("Workflow must have a start or trigger node.");

      // Check for end node
      const hasEnd = input.nodes.some(n => n.nodeType === "end");
      if (!hasEnd) warnings.push("Workflow has no end node.");

      // Check for duplicate node keys
      const keys = input.nodes.map(n => n.nodeKey);
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      if (dupes.length > 0) errors.push(`Duplicate node keys: ${dupes.join(", ")}`);

      // Check edges reference valid nodes
      for (const edge of input.edges) {
        if (!keys.includes(edge.sourceNodeKey)) {
          errors.push(`Edge references unknown source node: ${edge.sourceNodeKey}`);
        }
        if (!keys.includes(edge.targetNodeKey)) {
          errors.push(`Edge references unknown target node: ${edge.targetNodeKey}`);
        }
      }

      // Check for cycles (simple DFS)
      const adjacency = new Map<string, string[]>();
      for (const n of input.nodes) adjacency.set(n.nodeKey, []);
      for (const e of input.edges) {
        const list = adjacency.get(e.sourceNodeKey);
        if (list) list.push(e.targetNodeKey);
      }

      const visited = new Set<string>();
      const inStack = new Set<string>();
      let hasCycle = false;

      function dfs(key: string): boolean {
        if (inStack.has(key)) return true;
        if (visited.has(key)) return false;
        visited.add(key);
        inStack.add(key);
        for (const next of adjacency.get(key) ?? []) {
          if (dfs(next)) { hasCycle = true; return true; }
        }
        inStack.delete(key);
        return false;
      }

      for (const n of input.nodes) {
        if (!visited.has(n.nodeKey)) dfs(n.nodeKey);
      }
      if (hasCycle) errors.push("Workflow contains a cycle.");

      return { valid: errors.length === 0, errors, warnings };
    }),
});
