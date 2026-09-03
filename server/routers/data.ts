import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { dataSourceRuns, dataSources, documentChunks, documents } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { encryptJson } from "../crypto";
import { requireDb, writeAuditLog } from "../db";
import { enqueueJob } from "../jobs";
import { storageDelete, storageGet, storagePut } from "../storage";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });
const acceptedMimeTypes = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]);
const maximumUploadBytes = 10 * 1024 * 1024;
const connectionInput = z.object({ endpoint: z.string().url().max(2000), headers: z.record(z.string().max(120), z.string().max(4096)).refine(value => Object.keys(value).length <= 30, "At most 30 headers are allowed.").default({}) });

function normalizedName(name: string) { return name.replace(/[\\/\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 255); }
function publicHttpsEndpoint(rawUrl: string) {
  const endpoint = new URL(rawUrl);
  if (endpoint.protocol !== "https:") throw new TRPCError({ code: "BAD_REQUEST", message: "The data source endpoint must be a public HTTPS URL." });
  const hostname = endpoint.hostname.toLowerCase();
  const blockedHosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "metadata.google.internal", "169.254.169.254"];
  if (blockedHosts.includes(hostname)) throw new TRPCError({ code: "BAD_REQUEST", message: "The data source endpoint must be a public HTTPS URL." });
  if (/^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|fc00:|fe80:|::ffff:127\.)/.test(hostname)) throw new TRPCError({ code: "BAD_REQUEST", message: "The data source endpoint must be a public HTTPS URL." });
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) throw new TRPCError({ code: "BAD_REQUEST", message: "IP address endpoints are not allowed." });
  return endpoint;
}
export function mimeMatchesBytes(mimeType: string, bytes: Buffer) { const prefix = bytes.subarray(0, 8).toString("utf8"); if (mimeType === "application/pdf") return prefix.startsWith("%PDF-"); if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return bytes.subarray(0, 2).toString("utf8") === "PK"; return mimeType === "text/csv" && !bytes.subarray(0, Math.min(bytes.length, 2048)).includes(0); }

export const dataSourcesRouter = router({
  list: workspaceProcedure.input(workspaceInput.extend({ limit: z.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => { const db = await requireDb(); const rows = await db.select().from(dataSources).where(and(eq(dataSources.workspaceId, ctx.workspaceId), isNull(dataSources.deletedAt))).orderBy(desc(dataSources.updatedAt)).limit(input.limit); return rows.map(({ configuration, ...source }) => ({ ...source, configured: Boolean(configuration) })); }),
  create: workspaceManagerProcedure.input(workspaceInput.extend({ name: z.string().trim().min(2).max(160), type: z.string().trim().min(2).max(80) })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const [row] = await db.insert(dataSources).values({ workspaceId: ctx.workspaceId, name: input.name, type: input.type, status: "disconnected", createdById: ctx.user.id }).returning({ id: dataSources.id }); const id = row.id; await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.created", resourceType: "dataSource", resourceId: id }); return { id, status: "disconnected" as const }; }),
  configureHttp: workspaceManagerProcedure.input(workspaceInput.extend({ dataSourceId: z.number().int().positive(), connection: connectionInput })).mutation(async ({ ctx, input }) => { const endpoint = publicHttpsEndpoint(input.connection.endpoint); const db = await requireDb(); const source = (await db.select().from(dataSources).where(and(eq(dataSources.id, input.dataSourceId), eq(dataSources.workspaceId, ctx.workspaceId), isNull(dataSources.deletedAt))).limit(1))[0]; if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found in this workspace." }); await db.update(dataSources).set({ configuration: { mode: "http", secret: encryptJson({ endpoint: endpoint.toString(), headers: input.connection.headers }) }, status: "disconnected", lastError: null }).where(eq(dataSources.id, source.id)); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.configured", resourceType: "dataSource", resourceId: source.id }); return { success: true }; }),
  sync: workspaceMemberProcedure.input(workspaceInput.extend({ dataSourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const source = (await db.select().from(dataSources).where(and(eq(dataSources.id, input.dataSourceId), eq(dataSources.workspaceId, ctx.workspaceId), isNull(dataSources.deletedAt))).limit(1))[0]; if (!source?.configuration) throw new TRPCError({ code: "CONFLICT", message: "Configure this data source before syncing it." }); const [runRow] = await db.insert(dataSourceRuns).values({ workspaceId: ctx.workspaceId, dataSourceId: source.id, status: "pending", createdById: ctx.user.id }).returning({ id: dataSourceRuns.id }); const runId = runRow.id; await db.update(dataSources).set({ status: "syncing", lastError: null }).where(eq(dataSources.id, source.id)); await enqueueJob({ workspaceId: ctx.workspaceId, type: "data-source.sync", payload: { dataSourceId: source.id, runId, workspaceId: ctx.workspaceId } }); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.sync_queued", resourceType: "dataSourceRun", resourceId: runId }); return { id: runId, status: "pending" as const }; }),
  disconnect: workspaceManagerProcedure.input(workspaceInput.extend({ dataSourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const source = (await db.select().from(dataSources).where(and(eq(dataSources.id, input.dataSourceId), eq(dataSources.workspaceId, ctx.workspaceId), isNull(dataSources.deletedAt))).limit(1))[0]; if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found in this workspace." }); await db.update(dataSources).set({ status: "disconnected" }).where(eq(dataSources.id, input.dataSourceId)); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.disconnected", resourceType: "dataSource", resourceId: input.dataSourceId }); return { success: true }; }),
  delete: workspaceManagerProcedure.input(workspaceInput.extend({ dataSourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const source = (await db.select().from(dataSources).where(and(eq(dataSources.id, input.dataSourceId), eq(dataSources.workspaceId, ctx.workspaceId), isNull(dataSources.deletedAt))).limit(1))[0]; if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found in this workspace." }); await db.update(dataSources).set({ status: "disconnected", configuration: null, deletedAt: new Date() }).where(eq(dataSources.id, source.id)); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.deleted", resourceType: "dataSource", resourceId: source.id }); return { success: true }; }),
});

export const documentsRouter = router({
  list: workspaceProcedure.input(workspaceInput.extend({ limit: z.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => { const db = await requireDb(); return db.select().from(documents).where(and(eq(documents.workspaceId, ctx.workspaceId), isNull(documents.deletedAt))).orderBy(desc(documents.createdAt)).limit(input.limit); }),
  upload: workspaceMemberProcedure.input(workspaceInput.extend({ originalName: z.string().min(1).max(255), mimeType: z.string().max(120), dataBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (!acceptedMimeTypes.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "This document type is not allowed." });
    const safeName = normalizedName(input.originalName);
    if (!safeName || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.dataBase64)) throw new TRPCError({ code: "BAD_REQUEST", message: "The upload payload is invalid." });
    const bytes = Buffer.from(input.dataBase64, "base64");
    if (!bytes.length || bytes.length > maximumUploadBytes) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Files must be between 1 byte and 10 MB." });
    if (!mimeMatchesBytes(input.mimeType, bytes)) throw new TRPCError({ code: "BAD_REQUEST", message: "The file contents do not match the declared document type." });
    let stored;
    try {
      stored = await storagePut(`workspaces/${ctx.workspaceId}/documents/${Date.now()}-${safeName}`, bytes, input.mimeType);
    } catch (error) {
      if (error instanceof S3ServiceException && (error.name === "NoSuchBucket" || error.$metadata?.httpStatusCode === 404)) {
        throw new TRPCError({ code: "FAILED_PRECONDITION", message: "Document storage is not configured. Please create the S3 bucket and retry." });
      }
      throw error;
    }
    const db = await requireDb();
    const [docRow] = await db.insert(documents).values({ workspaceId: ctx.workspaceId, originalName: safeName, mimeType: input.mimeType, sizeBytes: bytes.length, storageKey: stored.key, storageUrl: stored.url, status: "processing", uploadedById: ctx.user.id }).returning({ id: documents.id });
    const id = docRow.id;
    await enqueueJob({ workspaceId: ctx.workspaceId, type: "document.process", payload: { documentId: id, workspaceId: ctx.workspaceId } });
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "document.uploaded", resourceType: "document", resourceId: id, metadata: { sizeBytes: bytes.length, mimeType: input.mimeType, processing: "queued" } });
    return { id, originalName: safeName, status: "processing" as const, sizeBytes: bytes.length };
  }),
  accessUrl: workspaceProcedure.input(workspaceInput.extend({ documentId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await requireDb(); const document = (await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.workspaceId, ctx.workspaceId), eq(documents.status, "ready"), isNull(documents.deletedAt))).limit(1))[0]; if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not available in this workspace." }); return storageGet(document.storageKey); }),
  delete: workspaceManagerProcedure.input(workspaceInput.extend({ documentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const document = (await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.workspaceId, ctx.workspaceId), isNull(documents.deletedAt))).limit(1))[0]; if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found in this workspace." }); await storageDelete(document.storageKey); await db.update(documents).set({ status: "deleted", deletedAt: new Date() }).where(eq(documents.id, input.documentId)); await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "document.deleted", resourceType: "document", resourceId: input.documentId }); return { success: true }; }),
});

export const memoryRouter = router({ summary: workspaceProcedure.input(workspaceInput).query(async ({ ctx }) => { const db = await requireDb(); const [documentList, sourceList, chunks] = await Promise.all([db.select().from(documents).where(and(eq(documents.workspaceId, ctx.workspaceId), eq(documents.status, "ready"), isNull(documents.deletedAt))), db.select().from(dataSources).where(and(eq(dataSources.workspaceId, ctx.workspaceId), isNull(dataSources.deletedAt))), db.select({ id: documentChunks.id }).from(documentChunks).where(eq(documentChunks.workspaceId, ctx.workspaceId))]); return { documents: documentList.length, dataSources: sourceList.length, indexedChunks: chunks.length, indexingAvailable: chunks.length > 0 }; }) });
