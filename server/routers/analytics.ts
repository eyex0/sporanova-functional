import { and, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { businessMetrics, conversations, messages } from "../../drizzle/schema";
import { workspaceProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });
const rangeDays = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 } as const;
const analyticsInput = workspaceInput.extend({ range: z.enum(["7D", "30D", "90D", "1Y"]).default("1Y"), segment: z.string().trim().max(80).optional() });

function dates(range: keyof typeof rangeDays) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - rangeDays[range]);
  const previous = new Date(start);
  previous.setUTCDate(previous.getUTCDate() - rangeDays[range]);
  return { start, end, previous };
}

export const analyticsRouter = router({
  overview: workspaceProcedure.input(analyticsInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start, previous } = dates(input.range);
    const currentRows = await db.select().from(businessMetrics).where(and(eq(businessMetrics.workspaceId, ctx.workspaceId), gte(businessMetrics.metricDate, start), input.segment ? eq(businessMetrics.segment, input.segment) : undefined));
    const previousRows = await db.select().from(businessMetrics).where(and(eq(businessMetrics.workspaceId, ctx.workspaceId), gte(businessMetrics.metricDate, previous), lt(businessMetrics.metricDate, start), input.segment ? eq(businessMetrics.segment, input.segment) : undefined));
    const summarize = (rows: typeof currentRows, key: string) => rows.filter(row => row.metricKey === key).reduce((sum, row) => sum + Number(row.metricValue), 0);
    const keys = ["mrr", "nrr", "cac", "acv", "revenue"];
    const kpis = Object.fromEntries(keys.map(key => {
      const value = summarize(currentRows, key);
      const prior = summarize(previousRows, key);
      return [key, { value, priorValue: prior, changePercent: prior === 0 ? null : ((value - prior) / Math.abs(prior)) * 100 }];
    }));
    return { range: input.range, kpis, series: currentRows.filter(row => row.metricKey === "revenue").map(row => ({ date: row.metricDate, value: Number(row.metricValue), segment: row.segment })) };
  }),

  segments: workspaceProcedure.input(analyticsInput.extend({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(25), sortBy: z.enum(["segment", "mrr", "nrr", "cac", "acv"]).default("segment"), sortDirection: z.enum(["asc", "desc"]).default("asc") })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start } = dates(input.range);
    const rows = await db.select({ segment: businessMetrics.segment, metricKey: businessMetrics.metricKey, total: sql<string>`sum(${businessMetrics.metricValue})` }).from(businessMetrics).where(and(eq(businessMetrics.workspaceId, ctx.workspaceId), gte(businessMetrics.metricDate, start))).groupBy(businessMetrics.segment, businessMetrics.metricKey);
    const grouped = new Map<string, Record<string, number>>();
    for (const row of rows) grouped.set(row.segment, { ...(grouped.get(row.segment) ?? {}), [row.metricKey]: Number(row.total) });
    const items = Array.from(grouped.entries()).map(([segment, values]) => ({ segment, ...values })) as Array<{ segment: string; mrr?: number; nrr?: number; cac?: number; acv?: number }>;
    items.sort((left, right) => {
      const leftValue = input.sortBy === "segment" ? left.segment : (left[input.sortBy] ?? 0);
      const rightValue = input.sortBy === "segment" ? right.segment : (right[input.sortBy] ?? 0);
      const comparison = typeof leftValue === "string" && typeof rightValue === "string" ? leftValue.localeCompare(rightValue) : Number(leftValue) - Number(rightValue);
      return input.sortDirection === "asc" ? comparison : -comparison;
    });
    const startIndex = (input.page - 1) * input.pageSize;
    return { items: items.slice(startIndex, startIndex + input.pageSize), total: items.length, page: input.page, pageSize: input.pageSize };
  }),

  topics: workspaceProcedure.input(workspaceInput.extend({ range: z.enum(["7D", "30D", "90D", "1Y"]).default("30D") })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start } = dates(input.range);
    const topicRows = await db.select({ topic: sql<string>`coalesce(${messages.metadata}->>'topic', 'General')`, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.role, "user"), gte(messages.createdAt, start)))
      .groupBy(sql`coalesce(${messages.metadata}->>'topic', 'General')`)
      .orderBy(sql`count(*) desc`)
      .limit(10);
    const total = topicRows.reduce((sum, row) => sum + Number(row.count), 0) || 1;
    const previousStart = new Date(start);
    previousStart.setUTCDate(previousStart.getUTCDate() - rangeDays[input.range]);
    const previousRows = await db.select({ topic: sql<string>`coalesce(${messages.metadata}->>'topic', 'General')`, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.role, "user"), gte(messages.createdAt, previousStart), lt(messages.createdAt, start)))
      .groupBy(sql`coalesce(${messages.metadata}->>'topic', 'General')`);
    const previousMap = new Map(previousRows.map(r => [r.topic, Number(r.count)]));
    return {
      items: topicRows.map((row, index) => {
        const current = Number(row.count);
        const prior = previousMap.get(row.topic) ?? 0;
        return {
          name: row.topic,
          count: current,
          percentage: Math.round((current / total) * 100),
          trend: prior === 0 ? "up" : current > prior ? "up" : current < prior ? "down" : "stable",
          rank: index + 1,
        };
      }),
      total,
    };
  }),

  sentiment: workspaceProcedure.input(workspaceInput.extend({ range: z.enum(["7D", "30D", "90D", "1Y"]).default("30D") })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start, previous } = dates(input.range);
    const sentimentRows = await db.select({ sentiment: sql<string>`coalesce(${messages.metadata}->>'sentiment', 'neutral')`, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.role, "user"), gte(messages.createdAt, start)))
      .groupBy(sql`coalesce(${messages.metadata}->>'sentiment', 'neutral')`);
    const previousRows = await db.select({ sentiment: sql<string>`coalesce(${messages.metadata}->>'sentiment', 'neutral')`, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.role, "user"), gte(messages.createdAt, previous), lt(messages.createdAt, start)))
      .groupBy(sql`coalesce(${messages.metadata}->>'sentiment', 'neutral')`);
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const row of sentimentRows) {
      const key = row.sentiment as keyof typeof counts;
      if (key in counts) counts[key] = Number(row.count);
    }
    const previousCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const row of previousRows) {
      const key = row.sentiment as keyof typeof previousCounts;
      if (key in previousCounts) previousCounts[key] = Number(row.count);
    }
    const total = counts.positive + counts.neutral + counts.negative;
    const previousTotal = previousCounts.positive + previousCounts.neutral + previousCounts.negative;
    const currentScore = total === 0 ? 0 : (counts.positive - counts.negative) / total;
    const previousScore = previousTotal === 0 ? 0 : (previousCounts.positive - previousCounts.negative) / previousTotal;
    return {
      positive: total === 0 ? 0 : Math.round((counts.positive / total) * 100),
      neutral: total === 0 ? 0 : Math.round((counts.neutral / total) * 100),
      negative: total === 0 ? 0 : Math.round((counts.negative / total) * 100),
      total,
      trend: currentScore > previousScore ? "up" : currentScore < previousScore ? "down" : "stable",
      currentScore,
      previousScore,
    };
  }),

  trends: workspaceProcedure.input(workspaceInput.extend({ range: z.enum(["7D", "30D", "90D", "1Y"]).default("30D"), metric: z.enum(["conversations", "messages", "positive_sentiment"]).default("conversations") })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start } = dates(input.range);
    if (input.metric === "conversations") {
      const rows = await db.select({ date: sql<string>`date_trunc('day', ${conversations.createdAt})::date::text`, count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(and(eq(conversations.workspaceId, ctx.workspaceId), gte(conversations.createdAt, start)))
        .groupBy(sql`date_trunc('day', ${conversations.createdAt})`)
        .orderBy(sql`date_trunc('day', ${conversations.createdAt})`);
      return { metric: input.metric, series: rows.map(r => ({ date: r.date, value: Number(r.count) })) };
    }
    if (input.metric === "messages") {
      const rows = await db.select({ date: sql<string>`date_trunc('day', ${messages.createdAt})::date::text`, count: sql<number>`count(*)::int` })
        .from(messages)
        .where(and(eq(messages.workspaceId, ctx.workspaceId), gte(messages.createdAt, start)))
        .groupBy(sql`date_trunc('day', ${messages.createdAt})`)
        .orderBy(sql`date_trunc('day', ${messages.createdAt})`);
      return { metric: input.metric, series: rows.map(r => ({ date: r.date, value: Number(r.count) })) };
    }
    const rows = await db.select({ date: sql<string>`date_trunc('day', ${messages.createdAt})::date::text`, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.role, "user"), gte(messages.createdAt, start), sql`coalesce(${messages.metadata}->>'sentiment', 'neutral') = 'positive'`))
      .groupBy(sql`date_trunc('day', ${messages.createdAt})`)
      .orderBy(sql`date_trunc('day', ${messages.createdAt})`);
    return { metric: input.metric, series: rows.map(r => ({ date: r.date, value: Number(r.count) })) };
  }),
});
