import { and, asc, eq, lte } from "drizzle-orm";
import { jobs } from "../drizzle/schema";
import { requireDb } from "./db";

export async function enqueueJob(input: { workspaceId?: number; type: string; payload: Record<string, unknown>; runAt?: Date; maxAttempts?: number }) {
  const db = await requireDb();
  const [row] = await db.insert(jobs).values({ workspaceId: input.workspaceId, type: input.type, payload: input.payload, runAt: input.runAt ?? new Date(), maxAttempts: input.maxAttempts ?? 3 }).returning({ id: jobs.id });
  return row.id;
}

export async function claimNextJob(workerId: string) {
  const db = await requireDb();
  const candidate = (await db.select().from(jobs).where(and(eq(jobs.status, "pending"), lte(jobs.runAt, new Date()))).orderBy(asc(jobs.runAt), asc(jobs.id)).limit(1))[0];
  if (!candidate) return null;
  const claimed = await db.update(jobs).set({ status: "running", attempts: candidate.attempts + 1, lockedAt: new Date(), lockedBy: workerId }).where(and(eq(jobs.id, candidate.id), eq(jobs.status, "pending"))).returning({ id: jobs.id });
  if (claimed.length === 0) return null;
  return { ...candidate, attempts: candidate.attempts + 1, status: "running" as const };
}

export async function completeJob(jobId: number) {
  const db = await requireDb();
  await db.update(jobs).set({ status: "completed", completedAt: new Date(), lockedAt: null, lockedBy: null, lastError: null }).where(eq(jobs.id, jobId));
}

export async function failJob(job: { id: number; attempts: number; maxAttempts: number }, error: unknown) {
  const db = await requireDb();
  const lastError = error instanceof Error ? error.message.slice(0, 2000) : "Unexpected worker error";
  const retry = job.attempts < job.maxAttempts;
  const delayMs = Math.min(60_000 * 2 ** Math.max(0, job.attempts - 1), 30 * 60_000);
  await db.update(jobs).set(retry ? { status: "pending", runAt: new Date(Date.now() + delayMs), lockedAt: null, lockedBy: null, lastError } : { status: "failed", completedAt: new Date(), lastError }).where(eq(jobs.id, job.id));
}
