import { randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { traces, traceSpans, costRecords } from "../../drizzle/schema";
import { requireDb } from "../db";

/* ───────────── Types ───────────── */

export type SpanKind = "internal" | "llm" | "tool" | "http" | "db";

export interface SpanAttributes {
  [key: string]: unknown;
}

export interface TraceContext {
  traceId: string;
  workspaceId: number;
  agentId: number;
  conversationId?: number;
  runId?: number;
}

export interface SpanStartOptions {
  name: string;
  kind?: SpanKind;
  parentSpanId?: string;
  input?: Record<string, unknown>;
  attributes?: SpanAttributes;
}

export interface SpanEndOptions {
  status?: "ok" | "error" | "unset";
  statusCode?: number;
  statusMessage?: string;
  output?: Record<string, unknown>;
  attributes?: SpanAttributes;
}

/* ──────── Pricing (USD per 1K tokens) ──────── */

const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.005, completion: 0.015 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
  "claude-3-5-sonnet": { prompt: 0.003, completion: 0.015 },
  "claude-3-5-haiku": { prompt: 0.00025, completion: 0.00125 },
  "claude-3-opus": { prompt: 0.015, completion: 0.075 },
  "gemini-2.0-flash": { prompt: 0.0001, completion: 0.0004 },
  "gemini-1.5-pro": { prompt: 0.00125, completion: 0.005 },
  "deepseek-chat": { prompt: 0.00014, completion: 0.00028 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1000;
}

/* ──────── Trace Recorder ──────── */

export class TraceRecorder {
  private traceDbId: number | null = null;
  private spanCount = 0;

  constructor(private ctx: TraceContext) {}

  /** Start a new trace — creates the trace record */
  async start(name: string, model?: string, provider?: string): Promise<void> {
    const db = await requireDb();
    const now = new Date();
    const [row] = await db.insert(traces).values({
      workspaceId: this.ctx.workspaceId,
      agentId: this.ctx.agentId,
      conversationId: this.ctx.conversationId,
      runId: this.ctx.runId,
      traceId: this.ctx.traceId,
      name,
      startTime: now,
      status: "ok",
      model,
      provider,
    }).returning({ id: traces.id });

    this.traceDbId = row.id;
  }

  /** Start a span within this trace */
  async startSpan(options: SpanStartOptions): Promise<string> {
    const db = await requireDb();
    const spanId = randomUUID();
    const now = new Date();

    await db.insert(traceSpans).values({
      traceId: this.traceDbId!,
      workspaceId: this.ctx.workspaceId,
      spanId,
      parentSpanId: options.parentSpanId,
      name: options.name,
      kind: options.kind ?? "internal",
      startTime: now,
      status: "ok",
      input: options.input,
      attributes: options.attributes,
    });

    this.spanCount++;
    return spanId;
  }

  /** End a span */
  async endSpan(spanId: string, options: SpanEndOptions = {}): Promise<void> {
    const db = await requireDb();
    const now = new Date();

    // Get span start time to calculate duration
    const [span] = await db
      .select({ startTime: traceSpans.startTime })
      .from(traceSpans)
      .where(and(eq(traceSpans.traceId, this.traceDbId!), eq(traceSpans.spanId, spanId)))
      .limit(1);

    const durationMs = span
      ? now.getTime() - new Date(span.startTime).getTime()
      : 0;

    await db
      .update(traceSpans)
      .set({
        endTime: now,
        durationMs,
        status: options.status ?? "ok",
        statusCode: options.statusCode,
        statusMessage: options.statusMessage,
        output: options.output,
        attributes: options.attributes
          ? { ...options.attributes }
          : undefined,
      })
      .where(and(eq(traceSpans.traceId, this.traceDbId!), eq(traceSpans.spanId, spanId)));
  }

  /** Record a cost entry */
  async recordCost(
    model: string,
    provider: string,
    promptTokens: number,
    completionTokens: number,
    agentId?: number,
    runId?: number,
  ): Promise<number> {
    const db = await requireDb();
    const costUsd = estimateCost(model, promptTokens, completionTokens);

    const [row] = await db.insert(costRecords).values({
      workspaceId: this.ctx.workspaceId,
      agentId: agentId ?? this.ctx.agentId,
      runId: runId ?? this.ctx.runId,
      traceId: this.traceDbId,
      model,
      provider,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costUsd,
    }).returning({ id: costRecords.id });

    return costUsd;
  }

  /** End the trace — updates final status and metrics */
  async end(
    status: "ok" | "error" | "unset" = "ok",
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
    cost?: number,
  ): Promise<void> {
    const db = await requireDb();
    const now = new Date();

    const [trace] = await db
      .select({ startTime: traces.startTime })
      .from(traces)
      .where(eq(traces.id, this.traceDbId!))
      .limit(1);

    const durationMs = trace
      ? now.getTime() - new Date(trace.startTime).getTime()
      : 0;

    await db
      .update(traces)
      .set({
        endTime: now,
        durationMs,
        status,
        spanCount: this.spanCount,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
        estimatedCost: cost?.toString(),
      })
      .where(eq(traces.id, this.traceDbId!));
  }
}

/** Create a new trace recorder */
export function createTrace(
  workspaceId: number,
  agentId: number,
  options: {
    conversationId?: number;
    runId?: number;
    traceId?: string;
  } = {},
): TraceRecorder {
  return new TraceRecorder({
    traceId: options.traceId ?? randomUUID(),
    workspaceId,
    agentId,
    conversationId: options.conversationId,
    runId: options.runId,
  });
}

/* ──────── Query Helpers ──────── */

export async function getTraceWithSpans(traceId: number) {
  const db = await requireDb();
  const trace = (await db.select().from(traces).where(eq(traces.id, traceId)).limit(1))[0];
  if (!trace) return null;
  const spans = await db
    .select()
    .from(traceSpans)
    .where(eq(traceSpans.traceId, traceId))
    .orderBy(traceSpans.startTime);
  return { trace, spans };
}

export async function listTraces(
  workspaceId: number,
  options: {
    agentId?: number;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  const db = await requireDb();
  const conditions = [eq(traces.workspaceId, workspaceId)];
  if (options.agentId) conditions.push(eq(traces.agentId, options.agentId));

  const result = await db
    .select()
    .from(traces)
    .where(and(...conditions))
    .orderBy(sql`${traces.createdAt} DESC`)
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);

  return result;
}

export async function getAgentTraceStats(
  workspaceId: number,
  agentId: number,
  days: number = 30,
) {
  const db = await requireDb();
  const since = new Date(Date.now() - days * 86400000);

  const stats = await db
    .select({
      count: sql<number>`count(*)::int`,
      avgDuration: sql<number>`avg(${traces.durationMs})::int`,
      p95Duration: sql<number>`percentile_cont(0.95) within group (order by ${traces.durationMs})::int`,
      totalTokens: sql<number>`sum(${traces.totalTokens})::int`,
      totalCost: sql<string>`sum(${traces.estimatedCost})::numeric(12,6)`,
      errorCount: sql<number>`count(*) filter (where ${traces.status} = 'error')::int`,
    })
    .from(traces)
    .where(
      and(
        eq(traces.workspaceId, workspaceId),
        eq(traces.agentId, agentId),
        sql`${traces.createdAt} >= ${since}`,
      ),
    );

  return stats[0] ?? {
    count: 0,
    avgDuration: 0,
    p95Duration: 0,
    totalTokens: 0,
    totalCost: "0",
    errorCount: 0,
  };
}
