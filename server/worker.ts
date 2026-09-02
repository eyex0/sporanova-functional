import "dotenv/config";
import { and, asc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import {
  agentRuns,
  agents,
  dataRecords,
  dataSourceRuns,
  dataSources,
  documentChunks,
  documents,
  notifications,
  users,
  workflowNodes,
  workflowRuns,
  workflows,
} from "../drizzle/schema";
import { decryptJson } from "./crypto";
import { requireDb, writeAuditLog } from "./db";
import { completeJob, claimNextJob, failJob } from "./jobs";
import { sendEmail } from "./email";
import { storageGet } from "./storage";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { AgentRuntime } from "./_core/agentRuntime";

const workerId = process.env.WORKER_ID ?? `worker-${randomUUID().slice(0, 8)}`;
const pollMs = Number(process.env.WORKER_POLL_MS ?? 1500);

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content
    .filter((part): part is { type: "text"; text: string } => typeof part === "object" && part !== null && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string")
    .map(part => part.text).join("\n");
  return "";
}

export function normalizedRecords(value: unknown) {
  const list = Array.isArray(value) ? value : Array.isArray((value as { data?: unknown[] } | null)?.data) ? (value as { data: unknown[] }).data : [value];
  return list.slice(0, 1000).map((item, index) => {
    const payload: Record<string, unknown> = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : { value: item };
    const candidate = payload.id ?? payload.externalId ?? payload.uuid ?? index;
    return { externalId: String(candidate).slice(0, 255), payload, searchableText: JSON.stringify(payload).slice(0, 20_000) };
  });
}

function stripXml(value: string) {
  return value.replace(/<w:tab\s*\/?\s*>/g, "\t").replace(/<w:br\s*\/?\s*>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function extractPdfText(value: Buffer) {
  const source = value.toString("latin1");
  return Array.from(source.matchAll(/\(([^()]{1,500})\)\s*Tj/g)).map(match => match[1]).join(" ").replace(/\\([\\()])/g, "$1").trim();
}

export async function extractDocumentText(bytes: Buffer, mimeType: string) {
  if (mimeType === "text/csv" || mimeType === "text/plain") return bytes.toString("utf8").replace(/\r\n/g, "\n").trim();
  if (mimeType === "application/pdf") return extractPdfText(bytes);
  const zip = await JSZip.loadAsync(bytes);
  if (mimeType.includes("wordprocessingml.document")) {
    const entry = zip.file("word/document.xml");
    return entry ? stripXml(await entry.async("text")) : "";
  }
  if (mimeType.includes("spreadsheetml.sheet")) {
    const names = Object.keys(zip.files).filter(name => name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
    const parts: string[] = [];
    for (const name of names) parts.push(stripXml(await zip.file(name)!.async("text")));
    return parts.join("\n");
  }
  return "";
}

export function chunkText(text: string, size = 3500) {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let offset = 0; offset < normalized.length; offset += size) chunks.push(normalized.slice(offset, offset + size));
  return chunks.slice(0, 500);
}

export function workflowExecutionPlan(nodes: Array<{ id: number; nodeKey: string; configuration: unknown }>) {
  const executed: number[] = [];
  const unsupported: string[] = [];
  for (const node of nodes) {
    const config = (node.configuration ?? {}) as Record<string, unknown>;
    if (config.action === "create_notification" && typeof config.recipientUserId === "number" && typeof config.title === "string" && typeof config.content === "string") executed.push(node.id);
    else unsupported.push(node.nodeKey);
  }
  return { executed, unsupported };
}

const runtime = new AgentRuntime({ useRag: true });

async function processAgentRun(payload: Record<string, unknown>) {
  const runId = Number(payload.runId); const agentId = Number(payload.agentId); const workspaceId = Number(payload.workspaceId); const actorUserId = Number(payload.actorUserId); const instruction = String(payload.instruction ?? "");
  if (!Number.isInteger(runId) || !Number.isInteger(agentId) || !Number.isInteger(workspaceId) || !instruction) throw new Error("Invalid agent.run job payload");
  const db = await requireDb();
  const agent = (await db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt))).limit(1))[0];
  if (!agent) throw new Error("Agent no longer exists in the workspace");
  await db.update(agentRuns).set({ status: "running", progress: 20, startedAt: new Date() }).where(and(eq(agentRuns.id, runId), eq(agentRuns.workspaceId, workspaceId)));
  try {
    const result = await runtime.execute({
      workspaceId,
      agentId,
      userId: actorUserId,
      message: instruction,
    });
    if (result.status === "failed") {
      await db.update(agentRuns).set({ status: "failed", progress: 100, errorMessage: result.error || "Runtime execution failed", completedAt: new Date() }).where(eq(agentRuns.id, runId));
      throw new Error(result.error || "Runtime execution failed");
    }
    await db.update(agentRuns).set({ status: "completed", progress: 100, output: { content: result.response, model: result.model, provider: result.provider, usage: result.usage, latencyMs: result.latencyMs }, completedAt: new Date() }).where(eq(agentRuns.id, runId));
    await db.update(agents).set({ lastActivityAt: new Date(), status: "idle" }).where(eq(agents.id, agentId));
    await writeAuditLog({ workspaceId, actorUserId, action: "agent.run_completed", resourceType: "agentRun", resourceId: runId, metadata: { agentId } });
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", progress: 100, errorMessage: "The configured AI provider could not complete this run.", completedAt: new Date() }).where(eq(agentRuns.id, runId));
    throw error;
  }
}

export async function processDataSourceSync(payload: Record<string, unknown>) {
  const dataSourceId = Number(payload.dataSourceId); const runId = Number(payload.runId); const workspaceId = Number(payload.workspaceId);
  if (!Number.isInteger(dataSourceId) || !Number.isInteger(runId) || !Number.isInteger(workspaceId)) throw new Error("Invalid data-source.sync job payload");
  const db = await requireDb();
  const source = (await db.select().from(dataSources).where(and(eq(dataSources.id, dataSourceId), eq(dataSources.workspaceId, workspaceId), isNull(dataSources.deletedAt))).limit(1))[0];
  if (!source?.configuration) throw new Error("Data source is not configured");
  const currentRun = (await db.select().from(dataSourceRuns).where(and(eq(dataSourceRuns.id, runId), eq(dataSourceRuns.workspaceId, workspaceId))).limit(1))[0];
  if (currentRun?.status === "completed") return;
  await db.update(dataSourceRuns).set({ status: "running", startedAt: new Date() }).where(eq(dataSourceRuns.id, runId));
  try {
    const configuration = decryptJson((source.configuration as Record<string, unknown>).secret);
    const response = await fetch(String(configuration.endpoint ?? ""), { headers: configuration.headers as Record<string, string>, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Data source returned HTTP ${response.status}`);
    const text = await response.text();
    const records = normalizedRecords(JSON.parse(text));
    for (const record of records) await db.insert(dataRecords).values({ workspaceId, dataSourceId, ...record }).onConflictDoUpdate({ target: [dataRecords.dataSourceId, dataRecords.externalId], set: { payload: record.payload, searchableText: record.searchableText } });
    await db.update(dataSourceRuns).set({ status: "completed", recordsProcessed: records.length, completedAt: new Date() }).where(eq(dataSourceRuns.id, runId));
    await db.update(dataSources).set({ status: "connected", recordCount: records.length, sizeBytes: Buffer.byteLength(text), lastSyncAt: new Date(), lastError: null }).where(eq(dataSources.id, dataSourceId));
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Data source sync failed";
    await db.update(dataSourceRuns).set({ status: "failed", errorMessage: message, completedAt: new Date() }).where(eq(dataSourceRuns.id, runId));
    await db.update(dataSources).set({ status: "failed", lastError: message }).where(eq(dataSources.id, dataSourceId));
    throw error;
  }
}

export async function processDocument(payload: Record<string, unknown>) {
  const documentId = Number(payload.documentId); const workspaceId = Number(payload.workspaceId);
  if (!Number.isInteger(documentId) || !Number.isInteger(workspaceId)) throw new Error("Invalid document.process job payload");
  const db = await requireDb();
  const document = (await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.workspaceId, workspaceId), isNull(documents.deletedAt))).limit(1))[0];
  if (!document || document.status === "deleted") return;
  if (document.status === "ready") {
    const existing = await db.select({ id: documentChunks.id }).from(documentChunks).where(eq(documentChunks.documentId, documentId)).limit(1);
    if (existing.length) return;
  }
  await db.update(documents).set({ status: "processing", processingError: null }).where(eq(documents.id, documentId));
  try {
    const signed = await storageGet(document.storageKey);
    const response = await fetch(signed.url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Document storage returned HTTP ${response.status}`);
    const text = await extractDocumentText(Buffer.from(await response.arrayBuffer()), document.mimeType);
    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("No extractable text was found in this document.");
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    await db.insert(documentChunks).values(chunks.map((content, chunkIndex) => ({ workspaceId, documentId, chunkIndex, content, metadata: { extractor: "sopranova-worker", mimeType: document.mimeType } })));
    await db.update(documents).set({ status: "ready", processingError: null }).where(eq(documents.id, documentId));
    await writeAuditLog({ workspaceId, actorUserId: document.uploadedById, action: "document.processed", resourceType: "document", resourceId: documentId, metadata: { chunks: chunks.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Document processing failed";
    await db.update(documents).set({ status: "failed", processingError: message }).where(eq(documents.id, documentId));
    throw error;
  }
}

export async function processWorkflowRun(payload: Record<string, unknown>) {
  const runId = Number(payload.runId); const workspaceId = Number(payload.workspaceId);
  if (!Number.isInteger(runId) || !Number.isInteger(workspaceId)) throw new Error("Invalid workflow.run job payload");
  const db = await requireDb();
  const run = (await db.select().from(workflowRuns).where(and(eq(workflowRuns.id, runId), eq(workflowRuns.workspaceId, workspaceId))).limit(1))[0];
  if (!run || run.status === "completed") return;
  const workflow = (await db.select().from(workflows).where(and(eq(workflows.id, run.workflowId), eq(workflows.workspaceId, workspaceId), isNull(workflows.deletedAt))).limit(1))[0];
  if (!workflow || workflow.status === "archived") throw new Error("Workflow is no longer executable");
  await db.update(workflowRuns).set({ status: "running", startedAt: new Date() }).where(eq(workflowRuns.id, runId));
  try {
    const actionNodes = await db.select().from(workflowNodes).where(and(eq(workflowNodes.workflowId, workflow.id), eq(workflowNodes.nodeType, "action"))).orderBy(asc(workflowNodes.sortOrder));
    const plan = workflowExecutionPlan(actionNodes);
    for (const node of actionNodes) {
      const config = (node.configuration ?? {}) as Record<string, unknown>;
      if (!plan.executed.includes(node.id)) continue;
      await db.insert(notifications).values({ workspaceId, recipientUserId: config.recipientUserId as number, type: "workflow", title: (config.title as string).slice(0, 255), content: config.content as string });
      const recipient = (await db.select().from(users).where(eq(users.id, config.recipientUserId as number)).limit(1))[0];
      if (recipient?.email) await sendEmail({ to: recipient.email, subject: (config.title as string).slice(0, 255), text: config.content as string });
    }
    if (!plan.executed.length) throw new Error("This workflow has no configured executable notification action.");
    const output = { executedNotificationNodes: plan.executed, unsupportedNodes: plan.unsupported };
    await db.update(workflowRuns).set({ status: plan.unsupported.length ? "failed" : "completed", output, errorMessage: plan.unsupported.length ? "Some workflow nodes are not configured with a supported action." : null, completedAt: new Date() }).where(eq(workflowRuns.id, runId));
    await writeAuditLog({ workspaceId, actorUserId: run.createdById ?? null, action: plan.unsupported.length ? "workflow.run_partially_failed" : "workflow.run_completed", resourceType: "workflowRun", resourceId: runId, metadata: { workflowId: workflow.id, ...output } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Workflow execution failed";
    await db.update(workflowRuns).set({ status: "failed", errorMessage: message, completedAt: new Date() }).where(eq(workflowRuns.id, runId));
    throw error;
  }
}

async function processOnce() {
  const job = await claimNextJob(workerId); if (!job) return false;
  try {
    if (job.type === "agent.run") await processAgentRun(job.payload);
    else if (job.type === "data-source.sync") await processDataSourceSync(job.payload);
    else if (job.type === "document.process") await processDocument(job.payload);
    else if (job.type === "workflow.run") await processWorkflowRun(job.payload);
    else if (job.type === "workflow.resume") await processWorkflowRun(job.payload);
    else throw new Error(`Unsupported job type: ${job.type}`);
    await completeJob(job.id);
  } catch (error) {
    await failJob(job, error);
    console.error(JSON.stringify({ event: "worker.job_failed", jobId: job.id, type: job.type, error: error instanceof Error ? error.message : "unknown" }));
  }
  return true;
}

async function loop() { try { while (await processOnce()) {} } catch (error) { console.error(JSON.stringify({ event: "worker.poll_error", error: error instanceof Error ? error.message : "unknown" })); } setTimeout(loop, pollMs); }
if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  console.info(JSON.stringify({ event: "worker.started", workerId, pollMs }));
  loop();
}
