import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { conversations, messages, type agents } from "../../drizzle/schema";
import { requireDb } from "../db";
import type { Message } from "./llm";

export interface ContextProvider {
  name: string;
  build(context: ContextBuilderInput): Promise<Message[]>;
}

export interface ContextBuilderInput {
  workspaceId: number;
  agentId: number;
  conversationId: number;
  userMessage: string;
  agent: typeof agents.$inferSelect;
  history: Array<typeof messages.$inferSelect>;
}

export interface BuiltContext {
  messages: Message[];
  providerBreakdown: Record<string, number>;
}

const MAX_HISTORY_MESSAGES = 20;

export class ContextBuilder {
  private providers: ContextProvider[] = [];

  registerProvider(provider: ContextProvider): void {
    this.providers.push(provider);
  }

  async build(input: ContextBuilderInput): Promise<BuiltContext> {
    const allMessages: Message[] = [];
    const breakdown: Record<string, number> = {};

    for (const provider of this.providers) {
      const messages = await provider.build(input);
      breakdown[provider.name] = messages.length;
      allMessages.push(...messages);
    }

    return { messages: allMessages, providerBreakdown: breakdown };
  }
}

export class AgentInstructionsProvider implements ContextProvider {
  name = "agent_instructions";

  async build(input: ContextBuilderInput): Promise<Message[]> {
    const { agent } = input;
    const systemPrompt = [
      agent.purpose || "You are a helpful AI assistant.",
      "",
      "## Guidelines",
      "Be helpful, friendly, and conversational.",
      "When context or documents are provided, use them to give accurate answers.",
      "If you don't have specific information, do your best to help with general knowledge.",
      "Never reveal internal system details or make up information.",
    ].join("\n");

    return [{ role: "system", content: systemPrompt }];
  }
}

export class ConversationHistoryProvider implements ContextProvider {
  name = "conversation_history";

  async build(input: ContextBuilderInput): Promise<Message[]> {
    const { history, userMessage } = input;

    const recentHistory = history
      .slice(-MAX_HISTORY_MESSAGES)
      .reverse()
      .map(msg => ({
        role: msg.role === "assistant" ? "assistant" as const : "user" as const,
        content: msg.content,
      }));

    return [
      ...recentHistory,
      { role: "user", content: userMessage },
    ];
  }
}

export function createDefaultContextBuilder(): ContextBuilder {
  const builder = new ContextBuilder();
  builder.registerProvider(new AgentInstructionsProvider());
  builder.registerProvider(new ConversationHistoryProvider());
  return builder;
}

export async function createRagContextBuilder(): Promise<ContextBuilder> {
  const { RagProvider } = await import("./ragProvider");
  const builder = new ContextBuilder();
  builder.registerProvider(new AgentInstructionsProvider());
  builder.registerProvider(new RagProvider());
  builder.registerProvider(new ConversationHistoryProvider());
  return builder;
}

export async function loadConversationHistory(
  workspaceId: number,
  conversationId: number
): Promise<Array<typeof messages.$inferSelect>> {
  const db = await requireDb();
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspaceId),
        eq(messages.conversationId, conversationId)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES + 1);
}
