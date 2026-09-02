import { requireDb } from "../db";
import type { ContextProvider, ContextBuilderInput } from "./contextBuilder";
import type { Message } from "./llm";

export interface RagSearchResult {
  id: number;
  content: string;
  sourceType: "document_chunk" | "data_record";
  sourceId: number;
  sourceLabel: string;
  rank: number;
  similarity: number;
  combinedScore: number;
}

export interface RagProviderConfig {
  maxChunks?: number;
  maxRecords?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

const DEFAULT_MAX_CHUNKS = 8;
const DEFAULT_MAX_RECORDS = 5;
const DEFAULT_MIN_SCORE = 0.05;

export class RagProvider implements ContextProvider {
  name = "rag_search";
  private maxChunks: number;
  private maxRecords: number;
  private minScore: number;
  private includeMetadata: boolean;

  constructor(config?: RagProviderConfig) {
    this.maxChunks = config?.maxChunks ?? DEFAULT_MAX_CHUNKS;
    this.maxRecords = config?.maxRecords ?? DEFAULT_MAX_RECORDS;
    this.minScore = config?.minScore ?? DEFAULT_MIN_SCORE;
    this.includeMetadata = config?.includeMetadata ?? true;
  }

  async build(input: ContextBuilderInput): Promise<Message[]> {
    const db = await requireDb();
    const query = this.extractSearchQuery(input.userMessage);

    if (!query || query.length < 3) {
      return [];
    }

    const [chunkResults, recordResults] = await Promise.all([
      this.searchDocumentChunks(db, input.workspaceId, query),
      this.searchDataRecords(db, input.workspaceId, query),
    ]);

    const messages: Message[] = [];

    if (chunkResults.length > 0) {
      const contextBlock = chunkResults
        .map((r, i) => `[Source ${i + 1}: ${r.sourceLabel}] ${r.content}`)
        .join("\n\n---\n\n");
      messages.push({
        role: "system",
        content: `Relevant document excerpts found for the user's question:\n\n${contextBlock}`,
      });
    }

    if (recordResults.length > 0) {
      const recordBlock = recordResults
        .map((r, i) => {
          const payload = typeof r.content === "string" ? r.content : JSON.stringify(r.content);
          return `[Record ${i + 1}: ${r.sourceLabel}] ${payload}`;
        })
        .join("\n\n---\n\n");
      messages.push({
        role: "system",
        content: `Relevant data records found:\n\n${recordBlock}`,
      });
    }

    return messages;
  }

  async searchWorkspace(
    workspaceId: number,
    query: string,
    limit?: number
  ): Promise<RagSearchResult[]> {
    const db = await requireDb();
    const [chunkResults, recordResults] = await Promise.all([
      this.searchDocumentChunks(db, workspaceId, query, limit),
      this.searchDataRecords(db, workspaceId, query, limit),
    ]);

    return [...chunkResults, ...recordResults].sort(
      (a, b) => b.combinedScore - a.combinedScore
    );
  }

  private extractSearchQuery(userMessage: string): string {
    const cleaned = userMessage
      .replace(/\b(tell me about|what is|what are|explain|describe|how does|how do|show me|find|search for|look up|give me information on|give me details on|what do you know about)\b/gi, "")
      .replace(/[?!.]/g, "")
      .trim();
    return cleaned.length > 3 ? cleaned : userMessage.replace(/[?!.]/g, "").trim();
  }

  private async searchDocumentChunks(
    db: any,
    workspaceId: number,
    query: string,
    limit?: number
  ): Promise<RagSearchResult[]> {
    try {
      const results = await db.execute(`
        SELECT * FROM search_document_chunks($1, $2, $3)
      `, [workspaceId, query, limit ?? this.maxChunks]);

      return (results?.rows ?? [])
        .filter((r: any) => (r.combined_score ?? 0) >= this.minScore)
        .map((r: any) => ({
          id: r.id,
          content: r.content,
          sourceType: "document_chunk" as const,
          sourceId: r.document_id,
          sourceLabel: `Document #${r.document_id} (chunk ${r.chunk_index})`,
          rank: r.rank ?? 0,
          similarity: r.similarity ?? 0,
          combinedScore: r.combined_score ?? 0,
        }));
    } catch {
      return this.fallbackChunkSearch(db, workspaceId, query, limit ?? this.maxChunks);
    }
  }

  private async searchDataRecords(
    db: any,
    workspaceId: number,
    query: string,
    limit?: number
  ): Promise<RagSearchResult[]> {
    try {
      const results = await db.execute(`
        SELECT * FROM search_data_records($1, $2, $3)
      `, [workspaceId, query, limit ?? this.maxRecords]);

      return (results?.rows ?? [])
        .filter((r: any) => (r.combined_score ?? 0) >= this.minScore)
        .map((r: any) => ({
          id: r.id,
          content: r.payload,
          sourceType: "data_record" as const,
          sourceId: r.data_source_id,
          sourceLabel: `Data Source #${r.data_source_id}`,
          rank: r.rank ?? 0,
          similarity: r.similarity ?? 0,
          combinedScore: r.combined_score ?? 0,
        }));
    } catch {
      return this.fallbackRecordSearch(db, workspaceId, query, limit ?? this.maxRecords);
    }
  }

  private async fallbackChunkSearch(
    db: any,
    workspaceId: number,
    query: string,
    limit: number
  ): Promise<RagSearchResult[]> {
    try {
      const { documentChunks, documents } = await import("../../drizzle/schema");
      const { eq, and, isNull, desc } = await import("drizzle-orm");

      const chunks = await db
        .select({
          id: documentChunks.id,
          content: documentChunks.content,
          documentId: documentChunks.documentId,
          chunkIndex: documentChunks.chunkIndex,
          createdAt: documentChunks.createdAt,
        })
        .from(documentChunks)
        .innerJoin(documents, eq(documentChunks.documentId, documents.id))
        .where(
          and(
            eq(documentChunks.workspaceId, workspaceId),
            eq(documents.status, "ready"),
            isNull(documents.deletedAt)
          )
        )
        .orderBy(desc(documentChunks.createdAt))
        .limit(200);

      const queryLower = query.toLowerCase();
      const scored = chunks
        .map((chunk: any) => {
          const contentLower = (chunk.content ?? "").toLowerCase();
          const words = queryLower.split(/\s+/).filter((w: string) => w.length > 2);
          const matchCount = words.filter((w: string) => contentLower.includes(w)).length;
          const score = words.length > 0 ? matchCount / words.length : 0;
          return { ...chunk, score };
        })
        .filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit);

      return scored.map((r: any) => ({
        id: r.id,
        content: r.content,
        sourceType: "document_chunk" as const,
        sourceId: r.documentId,
        sourceLabel: `Document #${r.documentId} (chunk ${r.chunkIndex})`,
        rank: r.score,
        similarity: 0,
        combinedScore: r.score,
      }));
    } catch {
      return [];
    }
  }

  private async fallbackRecordSearch(
    db: any,
    workspaceId: number,
    query: string,
    limit: number
  ): Promise<RagSearchResult[]> {
    try {
      const { dataRecords } = await import("../../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");

      const records = await db
        .select({
          id: dataRecords.id,
          payload: dataRecords.payload,
          searchableText: dataRecords.searchableText,
          dataSourceId: dataRecords.dataSourceId,
        })
        .from(dataRecords)
        .where(eq(dataRecords.workspaceId, workspaceId))
        .orderBy(desc(dataRecords.createdAt))
        .limit(200);

      const queryLower = query.toLowerCase();
      const scored = records
        .map((record: any) => {
          const text = (record.searchableText ?? "").toLowerCase();
          const words = queryLower.split(/\s+/).filter((w: string) => w.length > 2);
          const matchCount = words.filter((w: string) => text.includes(w)).length;
          const score = words.length > 0 ? matchCount / words.length : 0;
          return { ...record, score };
        })
        .filter((r: any) => r.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit);

      return scored.map((r: any) => ({
        id: r.id,
        content: r.payload,
        sourceType: "data_record" as const,
        sourceId: r.dataSourceId,
        sourceLabel: `Data Source #${r.dataSourceId}`,
        rank: r.score,
        similarity: 0,
        combinedScore: r.score,
      }));
    } catch {
      return [];
    }
  }
}

export function createRagProvider(config?: RagProviderConfig): RagProvider {
  return new RagProvider(config);
}
