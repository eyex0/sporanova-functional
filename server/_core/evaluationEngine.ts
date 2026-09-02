import { and, eq, sql, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  evaluationDatasets,
  evaluationTestCases,
  evaluationRuns,
} from "../../drizzle/schema";
import { requireDb, writeAuditLog } from "../db";
import { AgentRuntime, type AgentRuntimeResult } from "./agentRuntime";
import { createTrace, estimateCost } from "./traceRecorder";

/* ───────────── Types ───────────── */

export interface DatasetCreateInput {
  workspaceId: number;
  agentId?: number;
  name: string;
  description?: string;
  createdById?: number;
}

export interface TestCaseInput {
  datasetId: number;
  workspaceId: number;
  name?: string;
  input: string;
  expectedOutput?: string;
  expectedToolCalls?: Array<Record<string, unknown>>;
  referenceContext?: string;
  tags?: string[];
}

export interface EvalRunResult {
  runId: number;
  status: "completed" | "failed";
  totalCases: number;
  passedCases: number;
  failedCases: number;
  errorCases: number;
  avgScore: number;
  avgLatencyMs: number;
  totalTokens: number;
  estimatedCost: number;
  results: Array<{
    testCaseId: number;
    name?: string;
    input: string;
    expectedOutput?: string;
    actualOutput: string;
    score: number;
    passed: boolean;
    latencyMs: number;
    tokens: number;
    error?: string;
  }>;
}

/* ───────────── Scoring ───────────── */

/** Simple text similarity score using normalized longest common subsequence */
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  // LCS-based similarity
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLen = dp[m][n];
  return lcsLen / Math.max(m, n);
}

/** Keyword overlap score */
function keywordScore(expected: string, actual: string): number {
  if (!expected || !actual) return 0;
  const keywords = new Set(
    expected.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  );
  const actualWords = new Set(
    actual.toLowerCase().split(/\s+/),
  );
  let overlap = 0;
  for (const kw of keywords) {
    if (actualWords.has(kw)) overlap++;
  }
  return keywords.size > 0 ? overlap / keywords.size : 0;
}

/** Composite score: 60% similarity + 40% keyword overlap */
function compositeScore(expected: string, actual: string): number {
  const sim = textSimilarity(expected, actual);
  const kw = keywordScore(expected, actual);
  return Math.round((sim * 0.6 + kw * 0.4) * 10000) / 10000;
}

/* ───────────── Dataset Management ───────────── */

export async function createDataset(input: DatasetCreateInput): Promise<number> {
  const db = await requireDb();
  const [row] = await db.insert(evaluationDatasets).values({
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    name: input.name,
    description: input.description,
    createdById: input.createdById,
  }).returning({ id: evaluationDatasets.id });

  await writeAuditLog({
    workspaceId: input.workspaceId,
    actorUserId: input.createdById ?? 0,
    action: "eval.dataset_created",
    resourceType: "evaluationDataset",
    resourceId: row.id,
  });

  return row.id;
}

export async function addTestCase(input: TestCaseInput): Promise<number> {
  const db = await requireDb();
  const [row] = await db.insert(evaluationTestCases).values({
    datasetId: input.datasetId,
    workspaceId: input.workspaceId,
    name: input.name,
    input: input.input,
    expectedOutput: input.expectedOutput,
    expectedToolCalls: input.expectedToolCalls as Record<string, unknown>[],
    referenceContext: input.referenceContext,
    tags: input.tags ?? [],
  }).returning({ id: evaluationTestCases.id });

  // Increment test case count
  await db
    .update(evaluationDatasets)
    .set({
      testCaseCount: sql`${evaluationDatasets.testCaseCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(evaluationDatasets.id, input.datasetId));

  return row.id;
}

export async function getDatasetWithCases(datasetId: number) {
  const db = await requireDb();
  const dataset = (await db
    .select()
    .from(evaluationDatasets)
    .where(eq(evaluationDatasets.id, datasetId))
    .limit(1))[0];

  if (!dataset) return null;

  const cases = await db
    .select()
    .from(evaluationTestCases)
    .where(eq(evaluationTestCases.datasetId, datasetId))
    .orderBy(evaluationTestCases.id);

  return { dataset, cases };
}

export async function listDatasets(workspaceId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(evaluationDatasets)
    .where(eq(evaluationDatasets.workspaceId, workspaceId))
    .orderBy(desc(evaluationDatasets.updatedAt));
}

/* ───────────── Evaluation Run ───────────── */

export async function runEvaluation(params: {
  workspaceId: number;
  datasetId: number;
  agentId: number;
  userId: number;
  name?: string;
}): Promise<EvalRunResult> {
  const db = await requireDb();
  const { workspaceId, datasetId, agentId, userId, name } = params;

  // Load dataset + cases
  const dataset = (await db
    .select()
    .from(evaluationDatasets)
    .where(eq(evaluationDatasets.id, datasetId))
    .limit(1))[0];

  if (!dataset) throw new Error("Dataset not found");

  const cases = await db
    .select()
    .from(evaluationTestCases)
    .where(eq(evaluationTestCases.datasetId, datasetId))
    .orderBy(evaluationTestCases.id);

  if (cases.length === 0) throw new Error("Dataset has no test cases");

  // Create evaluation run record
  const [runRow] = await db.insert(evaluationRuns).values({
    workspaceId,
    datasetId,
    agentId,
    name: name ?? `Eval ${new Date().toISOString().slice(0, 10)}`,
    status: "running",
    totalCases: cases.length,
    startedAt: new Date(),
    createdById: userId,
  }).returning({ id: evaluationRuns.id });

  const runId = runRow.id;
  const results: EvalRunResult["results"] = [];
  let totalTokens = 0;
  let totalCost = 0;
  let totalLatencyMs = 0;
  let passedCases = 0;
  let failedCases = 0;
  let errorCases = 0;

  const runtime = new AgentRuntime({ maxTokens: 1024 });

  for (const testCase of cases) {
    const start = Date.now();
    let actualOutput = "";
    let tokens = 0;
    let error: string | undefined;
    let score = 0;

    try {
      // Create trace for this case
      const trace = createTrace(workspaceId, agentId, { runId });
      await trace.start(`eval.case.${testCase.id}`, "unknown", "evaluation");

      const result = await runtime.execute({
        workspaceId,
        agentId,
        userId,
        message: testCase.input,
      });

      actualOutput = result.response;
      tokens = result.usage?.totalTokens ?? 0;
      const latencyMs = Date.now() - start;

      // Score against expected output
      if (testCase.expectedOutput) {
        score = compositeScore(testCase.expectedOutput, actualOutput);
      } else {
        // No expected output — score based on non-empty response
        score = actualOutput && actualOutput.length > 10 ? 0.5 : 0;
      }

      // Record cost
      if (result.usage) {
        const cost = estimateCost(
          result.model,
          result.usage.promptTokens,
          result.usage.completionTokens,
        );
        totalCost += cost;
        await trace.recordCost(
          result.model,
          result.provider,
          result.usage.promptTokens,
          result.usage.completionTokens,
        );
      }

      await trace.end("ok", result.usage, totalCost);

      totalTokens += tokens;
      totalLatencyMs += latencyMs;

      const passed = score >= 0.3; // 30% threshold for pass
      if (passed) passedCases++;
      else failedCases++;

      results.push({
        testCaseId: testCase.id,
        name: testCase.name ?? undefined,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput ?? undefined,
        actualOutput,
        score,
        passed,
        latencyMs,
        tokens,
      });
    } catch (err) {
      error = String(err);
      actualOutput = "";
      errorCases++;
      results.push({
        testCaseId: testCase.id,
        name: testCase.name ?? undefined,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput ?? undefined,
        actualOutput: "",
        score: 0,
        passed: false,
        latencyMs: Date.now() - start,
        tokens: 0,
        error,
      });
    }
  }

  const avgScore = results.length > 0
    ? Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 10000) / 10000
    : 0;
  const avgLatencyMs = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length)
    : 0;

  // Update run record
  await db
    .update(evaluationRuns)
    .set({
      status: "completed",
      passedCases,
      failedCases,
      errorCases,
      avgScore: avgScore.toString(),
      avgLatencyMs,
      totalTokens,
      estimatedCost: totalCost.toString(),
      results: results as unknown as Record<string, unknown>,
      completedAt: new Date(),
    })
    .where(eq(evaluationRuns.id, runId));

  await writeAuditLog({
    workspaceId,
    actorUserId: userId,
    action: "eval.run_completed",
    resourceType: "evaluationRun",
    resourceId: runId,
    metadata: { avgScore, passedCases, failedCases, errorCases },
  });

  return {
    runId,
    status: "completed",
    totalCases: cases.length,
    passedCases,
    failedCases,
    errorCases,
    avgScore,
    avgLatencyMs,
    totalTokens,
    estimatedCost: totalCost,
    results,
  };
}

export async function getEvalRun(runId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(evaluationRuns)
    .where(eq(evaluationRuns.id, runId))
    .limit(1);
}

export async function listEvalRuns(workspaceId: number, datasetId?: number) {
  const db = await requireDb();
  const conditions = [eq(evaluationRuns.workspaceId, workspaceId)];
  if (datasetId) conditions.push(eq(evaluationRuns.datasetId, datasetId));
  return db
    .select()
    .from(evaluationRuns)
    .where(and(...conditions))
    .orderBy(desc(evaluationRuns.createdAt))
    .limit(50);
}
