import { and, eq, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { traces, traceSpans, evaluationDatasets, evaluationRuns, costRecords, agentRuns } from "../../drizzle/schema";
import { workspaceMemberProcedure, workspaceProcedure, workspaceManagerProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";
import {
  getTraceWithSpans,
  listTraces,
  getAgentTraceStats,
} from "../_core/traceRecorder";
import {
  createDataset,
  addTestCase,
  getDatasetWithCases,
  listDatasets,
  runEvaluation,
  getEvalRun,
  listEvalRuns,
} from "../_core/evaluationEngine";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

export const observabilityRouter = router({
  // ──────── Traces ────────

  traces: workspaceProcedure
    .input(workspaceInput.extend({
      agentId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      return listTraces(ctx.workspaceId, {
        agentId: input.agentId,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  traceDetail: workspaceProcedure
    .input(workspaceInput.extend({ traceId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await getTraceWithSpans(input.traceId);
      if (!result || result.trace.workspaceId !== ctx.workspaceId) return null;
      return result;
    }),

  agentStats: workspaceProcedure
    .input(workspaceInput.extend({
      agentId: z.number().int().positive(),
      days: z.number().int().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      return getAgentTraceStats(ctx.workspaceId, input.agentId, input.days);
    }),

  // ──────── Cost Analytics ────────

  costs: workspaceProcedure
    .input(workspaceInput.extend({
      days: z.number().int().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const since = new Date(Date.now() - input.days * 86400000);

      const byModel = await db
        .select({
          model: costRecords.model,
          provider: costRecords.provider,
          totalCalls: sql<number>`count(*)::int`,
          totalTokens: sql<number>`sum(${costRecords.totalTokens})::int`,
          totalCost: sql<string>`sum(${costRecords.costUsd})::numeric(12,6)`,
          avgTokens: sql<number>`avg(${costRecords.totalTokens})::int`,
        })
        .from(costRecords)
        .where(
          and(
            eq(costRecords.workspaceId, ctx.workspaceId),
            sql`${costRecords.createdAt} >= ${since}`,
          ),
        )
        .groupBy(costRecords.model, costRecords.provider)
        .orderBy(sql`sum(${costRecords.costUsd}) DESC`);

      const daily = await db
        .select({
          date: sql<string>`date(${costRecords.createdAt})`,
          cost: sql<string>`sum(${costRecords.costUsd})::numeric(12,6)`,
          tokens: sql<number>`sum(${costRecords.totalTokens})::int`,
          calls: sql<number>`count(*)::int`,
        })
        .from(costRecords)
        .where(
          and(
            eq(costRecords.workspaceId, ctx.workspaceId),
            sql`${costRecords.createdAt} >= ${since}`,
          ),
        )
        .groupBy(sql`date(${costRecords.createdAt})`)
        .orderBy(sql`date(${costRecords.createdAt})`);

      const totals = await db
        .select({
          totalCost: sql<string>`coalesce(sum(${costRecords.costUsd}), 0)::numeric(12,6)`,
          totalTokens: sql<number>`coalesce(sum(${costRecords.totalTokens}), 0)::int`,
          totalCalls: sql<number>`count(*)::int`,
        })
        .from(costRecords)
        .where(
          and(
            eq(costRecords.workspaceId, ctx.workspaceId),
            sql`${costRecords.createdAt} >= ${since}`,
          ),
        );

      return {
        byModel,
        daily,
        totals: totals[0] ?? { totalCost: "0", totalTokens: 0, totalCalls: 0 },
      };
    }),

  // ──────── Performance Metrics ────────

  performance: workspaceProcedure
    .input(workspaceInput.extend({
      agentId: z.number().int().positive().optional(),
      days: z.number().int().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const since = new Date(Date.now() - input.days * 86400000);
      const conditions = [
        eq(agentRuns.workspaceId, ctx.workspaceId),
        sql`${agentRuns.createdAt} >= ${since}`,
        eq(agentRuns.status, "completed"),
      ];
      if (input.agentId) conditions.push(eq(agentRuns.agentId, input.agentId));

      const runs = await db
        .select({
          count: sql<number>`count(*)::int`,
          avgLatency: sql<number>`avg((${agentRuns.output}->>'latencyMs')::int)`,
          p50Latency: sql<number>`percentile_cont(0.5) within group (order by (${agentRuns.output}->>'latencyMs')::int)`,
          p95Latency: sql<number>`percentile_cont(0.95) within group (order by (${agentRuns.output}->>'latencyMs')::int)`,
          p99Latency: sql<number>`percentile_cont(0.99) within group (order by (${agentRuns.output}->>'latencyMs')::int)`,
          avgTokens: sql<number>`avg((${agentRuns.output}->>'usage'->>'totalTokens')::int)`,
          totalTokens: sql<number>`sum((${agentRuns.output}->>'usage'->>'totalTokens')::int)`,
        })
        .from(agentRuns)
        .where(and(...conditions));

      const byAgent = await db
        .select({
          agentId: agentRuns.agentId,
          count: sql<number>`count(*)::int`,
          avgLatency: sql<number>`avg((${agentRuns.output}->>'latencyMs')::int)`,
          avgTokens: sql<number>`avg((${agentRuns.output}->>'usage'->>'totalTokens')::int)`,
        })
        .from(agentRuns)
        .where(and(...conditions))
        .groupBy(agentRuns.agentId)
        .orderBy(sql`count(*) DESC`)
        .limit(10);

      const daily = await db
        .select({
          date: sql<string>`date(${agentRuns.createdAt})`,
          count: sql<number>`count(*)::int`,
          avgLatency: sql<number>`avg((${agentRuns.output}->>'latencyMs')::int)`,
        })
        .from(agentRuns)
        .where(and(...conditions))
        .groupBy(sql`date(${agentRuns.createdAt})`)
        .orderBy(sql`date(${agentRuns.createdAt})`);

      return {
        summary: runs[0] ?? {
          count: 0, avgLatency: 0, p50Latency: 0, p95Latency: 0, p99Latency: 0,
          avgTokens: 0, totalTokens: 0,
        },
        byAgent,
        daily,
      };
    }),

  // ──────── Evaluation Datasets ────────

  datasets: workspaceProcedure
    .input(workspaceInput)
    .query(async ({ ctx }) => {
      return listDatasets(ctx.workspaceId);
    }),

  datasetDetail: workspaceProcedure
    .input(workspaceInput.extend({ datasetId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await getDatasetWithCases(input.datasetId);
      if (!result || result.dataset.workspaceId !== ctx.workspaceId) return null;
      return result;
    }),

  createDataset: workspaceManagerProcedure
    .input(workspaceInput.extend({
      name: z.string().trim().min(2).max(255),
      description: z.string().trim().max(2000).optional(),
      agentId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createDataset({
        workspaceId: ctx.workspaceId,
        agentId: input.agentId,
        name: input.name,
        description: input.description,
        createdById: ctx.user.id,
      });
      return { id };
    }),

  addTestCase: workspaceManagerProcedure
    .input(workspaceInput.extend({
      datasetId: z.number().int().positive(),
      name: z.string().trim().max(255).optional(),
      input: z.string().trim().min(1),
      expectedOutput: z.string().optional(),
      referenceContext: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await addTestCase({
        datasetId: input.datasetId,
        workspaceId: ctx.workspaceId,
        name: input.name,
        input: input.input,
        expectedOutput: input.expectedOutput,
        referenceContext: input.referenceContext,
        tags: input.tags,
      });
      return { id };
    }),

  // ──────── Evaluation Runs ────────

  runEval: workspaceMemberProcedure
    .input(workspaceInput.extend({
      datasetId: z.number().int().positive(),
      agentId: z.number().int().positive(),
      name: z.string().trim().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return runEvaluation({
        workspaceId: ctx.workspaceId,
        datasetId: input.datasetId,
        agentId: input.agentId,
        userId: ctx.user.id,
        name: input.name,
      });
    }),

  evalRuns: workspaceProcedure
    .input(workspaceInput.extend({
      datasetId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return listEvalRuns(ctx.workspaceId, input.datasetId);
    }),

  evalRunDetail: workspaceProcedure
    .input(workspaceInput.extend({ runId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const runs = await getEvalRun(input.runId);
      const run = runs[0];
      if (!run || run.workspaceId !== ctx.workspaceId) return null;
      return run;
    }),
});
