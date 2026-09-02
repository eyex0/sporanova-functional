import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { agents, agentRuns, conversations, messages, messageSources } from "../../drizzle/schema";
import { requireDb, writeAuditLog } from "../db";
import { modelGatewayInvoke, type ModelResponse } from "./modelGateway";
import {
  createDefaultContextBuilder,
  createRagContextBuilder,
  loadConversationHistory,
  type ContextBuilder,
  type BuiltContext,
} from "./contextBuilder";
import { loadWorkspaceTools, toolsToLLMFormat, executeToolCall, type ToolCallRequest, type ToolExecutionContext } from "./toolRegistry";
import { ConversationMemory } from "./conversationMemory";
import type { Message } from "./llm";

export interface AgentRuntimeRequest {
  workspaceId: number;
  agentId: number;
  conversationId?: number;
  userId: number;
  message: string;
}

export interface AgentRuntimeResult {
  executionId: string;
  response: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  latencyMs: number;
  iterations: number;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: unknown;
    latencyMs: number;
  }>;
  status: "completed" | "failed";
  error?: string;
}

export interface AgentRuntimeConfig {
  maxIterations?: number;
  timeoutMs?: number;
  maxTokens?: number;
  contextBuilder?: ContextBuilder;
  useRag?: boolean;
  enableTools?: boolean;
}

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 1400;

export class AgentRuntime {
  private contextBuilder: ContextBuilder | null;
  private useRag: boolean;
  private enableTools: boolean;
  private maxIterations: number;
  private timeoutMs: number;
  private maxTokens: number;
  private memory: ConversationMemory;

  constructor(config?: AgentRuntimeConfig) {
    this.contextBuilder = config?.contextBuilder ?? null;
    this.useRag = config?.useRag ?? false;
    this.enableTools = config?.enableTools ?? true;
    this.maxIterations = config?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxTokens = config?.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.memory = new ConversationMemory();
  }

  private async getContextBuilder(): Promise<ContextBuilder> {
    if (this.contextBuilder) return this.contextBuilder;
    if (this.useRag) {
      this.contextBuilder = await createRagContextBuilder();
    } else {
      this.contextBuilder = createDefaultContextBuilder();
    }
    return this.contextBuilder;
  }

  async execute(request: AgentRuntimeRequest): Promise<AgentRuntimeResult> {
    const executionId = randomUUID();
    const startTime = Date.now();
    const executedToolCalls: AgentRuntimeResult["toolCalls"] = [];

    const db = await requireDb();

    const agent = await this.loadAgent(request.workspaceId, request.agentId);
    if (!agent) {
      return {
        executionId, response: "", model: "", provider: "",
        usage: null, latencyMs: Date.now() - startTime, iterations: 0,
        status: "failed", error: "Agent not found in this workspace.",
      };
    }

    const conversation = request.conversationId
      ? await this.loadConversation(request.workspaceId, request.conversationId)
      : null;
    if (request.conversationId && !conversation) {
      return {
        executionId, response: "", model: "", provider: "",
        usage: null, latencyMs: Date.now() - startTime, iterations: 0,
        status: "failed", error: "Conversation not found in this workspace.",
      };
    }

    const history = request.conversationId
      ? await loadConversationHistory(request.workspaceId, request.conversationId)
      : [];

    const contextBuilder = await this.getContextBuilder();
    const builtContext = await contextBuilder.build({
      workspaceId: request.workspaceId,
      agentId: request.agentId,
      conversationId: request.conversationId ?? 0,
      userMessage: request.message,
      agent,
      history,
    });

    const workspaceTools = this.enableTools
      ? await loadWorkspaceTools(request.workspaceId)
      : [];
    const llmTools = workspaceTools.length > 0 ? toolsToLLMFormat(workspaceTools) : undefined;

    let messages: Message[] = [...builtContext.messages];
    let lastResponse: ModelResponse | null = null;
    let iterations = 0;
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    try {
      for (let i = 0; i < this.maxIterations; i++) {
        iterations = i + 1;

        lastResponse = await Promise.race([
          modelGatewayInvoke({
            messages,
            maxTokens: this.maxTokens,
            tools: llmTools,
            toolChoice: llmTools && llmTools.length > 0 ? "auto" : undefined,
          }),
          this.timeout(),
        ]);

        if (lastResponse.usage) {
          totalUsage.promptTokens += lastResponse.usage.promptTokens;
          totalUsage.completionTokens += lastResponse.usage.completionTokens;
          totalUsage.totalTokens += lastResponse.usage.totalTokens;
        }

        if (!lastResponse.toolCalls || lastResponse.toolCalls.length === 0) {
          break;
        }

        const toolContext: ToolExecutionContext = {
          workspaceId: request.workspaceId,
          agentId: request.agentId,
          conversationId: request.conversationId,
          userId: request.userId,
        };

        messages.push({
          role: "assistant",
          content: lastResponse.content || "",
          tool_calls: lastResponse.toolCalls.map(tc => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        } as any);

        for (const toolCall of lastResponse.toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(toolCall.arguments);
          } catch {}

          const result = await executeToolCall(
            { id: toolCall.id, name: toolCall.name, arguments: parsedArgs },
            toolContext,
            workspaceTools
          );

          executedToolCalls.push({
            name: result.name,
            arguments: parsedArgs,
            result: result.result,
            latencyMs: result.latencyMs,
          });

          messages.push({
            role: "tool",
            content: result.error
              ? `Error: ${result.error}`
              : JSON.stringify(result.result),
            tool_call_id: toolCall.id,
          } as any);
        }
      }

      const content = lastResponse?.content || "I could not produce a response.";

      if (request.conversationId) {
        await this.saveAssistantMessage(
          request.workspaceId,
          request.conversationId,
          content,
          { executionId, agentId: request.agentId, model: lastResponse?.model, provider: lastResponse?.provider, iterations, toolCallCount: executedToolCalls.length }
        );

        if (iterations > 3) {
          this.memory.summarizeConversation(request.workspaceId, request.conversationId, agent.name).catch(() => {});
        }

        this.memory.extractAndStoreFacts(
          request.workspaceId, request.conversationId, request.agentId, request.userId, request.message
        ).catch(() => {});
      }

      await this.recordExecution(request, {
        executionId, agentId: request.agentId, status: "completed",
        content, model: lastResponse?.model ?? "", provider: lastResponse?.provider ?? "",
        usage: totalUsage, latencyMs: Date.now() - startTime, iterations,
        toolCalls: executedToolCalls, contextBreakdown: builtContext.providerBreakdown,
      });

      await db.update(agents).set({ lastActivityAt: new Date() }).where(eq(agents.id, request.agentId));

      return {
        executionId, response: content,
        model: lastResponse?.model ?? "", provider: lastResponse?.provider ?? "",
        usage: totalUsage, latencyMs: Date.now() - startTime, iterations,
        toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        status: "completed",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Runtime execution failed";

      await this.recordExecution(request, {
        executionId, agentId: request.agentId, status: "failed",
        content: "", model: lastResponse?.model ?? "", provider: lastResponse?.provider ?? "",
        usage: totalUsage, latencyMs: Date.now() - startTime, iterations,
        toolCalls: executedToolCalls, error: errorMessage,
        contextBreakdown: builtContext.providerBreakdown,
      });

      console.error(JSON.stringify({ event: "agent_runtime.error", executionId, agentId: request.agentId, workspaceId: request.workspaceId, error: errorMessage }));

      return {
        executionId, response: "",
        model: lastResponse?.model ?? "", provider: lastResponse?.provider ?? "",
        usage: totalUsage, latencyMs: Date.now() - startTime, iterations,
        toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        status: "failed", error: "The AI provider could not complete this request. Please retry.",
      };
    }
  }

  private async loadAgent(workspaceId: number, agentId: number) {
    const db = await requireDb();
    return (
      await db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.id, agentId),
            eq(agents.workspaceId, workspaceId),
            isNull(agents.deletedAt)
          )
        )
        .limit(1)
    )[0] ?? null;
  }

  private async loadConversation(workspaceId: number, conversationId: number) {
    const db = await requireDb();
    return (
      await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.workspaceId, workspaceId),
            isNull(conversations.deletedAt)
          )
        )
        .limit(1)
    )[0] ?? null;
  }

  private async saveAssistantMessage(
    workspaceId: number,
    conversationId: number,
    content: string,
    metadata: Record<string, unknown>
  ): Promise<number> {
    const db = await requireDb();
    const [row] = await db
      .insert(messages)
      .values({
        workspaceId,
        conversationId,
        role: "assistant",
        kind: "insight",
        content,
        metadata,
      })
      .returning({ id: messages.id });

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return row.id;
  }

  private async recordExecution(
    request: AgentRuntimeRequest,
    data: {
      executionId: string;
      agentId: number;
      status: "completed" | "failed";
      content: string;
      model: string;
      provider: string;
      usage: ModelResponse["usage"];
      latencyMs: number;
      iterations: number;
      error?: string;
      toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result: unknown; latencyMs: number }>;
      contextBreakdown?: Record<string, number>;
    }
  ): Promise<void> {
    const db = await requireDb();

    await db.insert(agentRuns).values({
      workspaceId: request.workspaceId,
      agentId: data.agentId,
      status: data.status,
      triggerType: "manual",
      progress: data.status === "completed" ? 100 : 100,
      input: { message: request.message, executionId: data.executionId },
      output: {
        content: data.content,
        model: data.model,
        provider: data.provider,
        usage: data.usage,
        latencyMs: data.latencyMs,
        iterations: data.iterations,
        toolCalls: data.toolCalls,
        contextBreakdown: data.contextBreakdown,
      },
      errorMessage: data.error ?? null,
      startedAt: new Date(Date.now() - data.latencyMs),
      completedAt: new Date(),
      createdById: request.userId,
    });

    await writeAuditLog({
      workspaceId: request.workspaceId,
      actorUserId: request.userId,
      action: data.status === "completed" ? "agent.chat_completed" : "agent.chat_failed",
      resourceType: "agentRun",
      resourceId: request.agentId,
      metadata: {
        executionId: data.executionId,
        conversationId: request.conversationId ?? null,
        model: data.model,
        provider: data.provider,
        latencyMs: data.latencyMs,
        iterations: data.iterations,
      },
    });
  }

  private timeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Agent runtime execution timed out")), this.timeoutMs);
    });
  }
}
