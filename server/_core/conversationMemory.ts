import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { conversations, messages, agentMemory } from "../../drizzle/schema";
import { requireDb, writeAuditLog } from "../db";
import { modelGatewayInvoke } from "./modelGateway";

export interface MemoryEntry {
  id: number;
  workspaceId: number;
  agentId: number;
  conversationId?: number;
  memoryType: "summary" | "fact" | "preference" | "context";
  content: string;
  metadata: Record<string, unknown>;
  relevance: number;
  createdAt: Date;
}

export interface ConversationSummary {
  conversationId: number;
  summary: string;
  keyFacts: string[];
  messageCount: number;
  tokenEstimate: number;
}

const MAX_MESSAGES_BEFORE_SUMMARY = 30;
const SUMMARY_TARGET_TOKENS = 500;

export class ConversationMemory {
  async shouldSummarize(workspaceId: number, conversationId: number): Promise<boolean> {
    const db = await requireDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.workspaceId, workspaceId), eq(messages.conversationId, conversationId)));
    return (result?.count ?? 0) >= MAX_MESSAGES_BEFORE_SUMMARY;
  }

  async summarizeConversation(
    workspaceId: number,
    conversationId: number,
    agentName: string
  ): Promise<ConversationSummary> {
    const db = await requireDb();

    const recentMessages = await db
      .select()
      .from(messages)
      .where(and(eq(messages.workspaceId, workspaceId), eq(messages.conversationId, conversationId)))
      .orderBy(desc(messages.createdAt))
      .limit(MAX_MESSAGES_BEFORE_SUMMARY);

    if (recentMessages.length === 0) {
      return { conversationId, summary: "", keyFacts: [], messageCount: 0, tokenEstimate: 0 };
    }

    const messagesText = recentMessages
      .reverse()
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    try {
      const result = await modelGatewayInvoke({
        messages: [
          {
            role: "system",
            content: `You are a conversation summarizer for the agent "${agentName}". 
Summarize the following conversation in 2-3 sentences. 
Extract key facts and user preferences. 
Return JSON: { "summary": "...", "keyFacts": ["fact1", "fact2"] }`,
          },
          { role: "user", content: messagesText },
        ],
        maxTokens: SUMMARY_TARGET_TOKENS,
      });

      const parsed = parseSummaryResponse(result.content);
      const summary: ConversationSummary = {
        conversationId,
        summary: parsed.summary,
        keyFacts: parsed.keyFacts,
        messageCount: recentMessages.length,
        tokenEstimate: Math.ceil(messagesText.length / 4),
      };

      await this.storeMemory(workspaceId, conversationId, 0, "summary", summary.summary, {
        keyFacts: summary.keyFacts,
        messageCount: summary.messageCount,
      });

      return summary;
    } catch (error) {
      console.error(JSON.stringify({ event: "memory.summary_error", error: error instanceof Error ? error.message : "unknown" }));
      return { conversationId, summary: "", keyFacts: [], messageCount: recentMessages.length, tokenEstimate: 0 };
    }
  }

  async extractAndStoreFacts(
    workspaceId: number,
    conversationId: number,
    agentId: number,
    userId: number,
    messageContent: string
  ): Promise<void> {
    try {
      const result = await modelGatewayInvoke({
        messages: [
          {
            role: "system",
            content: `Extract important facts, user preferences, or context from this message. 
Return JSON: { "facts": ["fact1", ...], "preferences": ["pref1", ...] } 
If nothing important, return { "facts": [], "preferences": [] }`,
          },
          { role: "user", content: messageContent },
        ],
        maxTokens: 300,
      });

      const parsed = parseFactsResponse(result.content);

      for (const fact of parsed.facts) {
        await this.storeMemory(workspaceId, conversationId, agentId, "fact", fact, {
          source: "auto_extract",
        });
      }

      for (const pref of parsed.preferences) {
        await this.storeMemory(workspaceId, conversationId, agentId, "preference", pref, {
          source: "auto_extract",
        });
      }
    } catch {
      // Silent — fact extraction is best-effort
    }
  }

  async retrieveRelevantMemory(
    workspaceId: number,
    agentId: number,
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const db = await requireDb();

    const memories = await db
      .select()
      .from(agentMemory)
      .where(and(eq(agentMemory.workspaceId, workspaceId), eq(agentMemory.agentId, agentId), isNull(agentMemory.deletedAt)))
      .orderBy(desc(agentMemory.createdAt))
      .limit(50);

    const queryLower = query.toLowerCase();
    const scored = memories
      .map(m => {
        const contentLower = (m.content ?? "").toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length > 2);
        const matches = words.filter(w => contentLower.includes(w)).length;
        const score = words.length > 0 ? matches / words.length : 0;
        return { ...m, relevance: score };
      })
      .filter(m => m.relevance > 0 || m.memoryType === "summary")
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return scored.map(rowToMemoryEntry);
  }

  async getContextPrompt(workspaceId: number, agentId: number, query: string): Promise<string> {
    const memories = await this.retrieveRelevantMemory(workspaceId, agentId, query, 5);
    if (memories.length === 0) return "";

    const lines = memories.map(m => {
      switch (m.memoryType) {
        case "summary": return `[Conversation Summary] ${m.content}`;
        case "fact": return `[Known Fact] ${m.content}`;
        case "preference": return `[User Preference] ${m.content}`;
        default: return `[Context] ${m.content}`;
      }
    });

    return `\n## Known Context\n${lines.join("\n")}\n`;
  }

  private async storeMemory(
    workspaceId: number,
    conversationId: number,
    agentId: number,
    memoryType: MemoryEntry["memoryType"],
    content: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const db = await requireDb();
    await db.insert(agentMemory).values({
      workspaceId,
      agentId,
      conversationId: conversationId || null,
      memoryType,
      content,
      metadata,
      createdById: 0,
    });
  }
}

function parseSummaryResponse(content: string): { summary: string; keyFacts: string[] } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary ?? content,
        keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [],
      };
    }
  } catch {}
  return { summary: content, keyFacts: [] };
}

function parseFactsResponse(content: string): { facts: string[]; preferences: string[] } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        facts: Array.isArray(parsed.facts) ? parsed.facts : [],
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
      };
    }
  } catch {}
  return { facts: [], preferences: [] };
}

function rowToMemoryEntry(row: any): MemoryEntry {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    agentId: row.agentId,
    conversationId: row.conversationId,
    memoryType: row.memoryType,
    content: row.content,
    metadata: row.metadata ?? {},
    relevance: 0,
    createdAt: row.createdAt,
  };
}
