import { and, desc, eq, isNull } from "drizzle-orm";
import { tools, toolExecutions } from "../../drizzle/schema";
import { requireDb, writeAuditLog } from "../db";

export interface ToolDefinition {
  id: number;
  workspaceId: number;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handlerType: "builtin" | "webhook" | "code";
  handlerConfig: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
  latencyMs: number;
}

export interface ToolExecutor {
  (args: Record<string, unknown>, context: ToolExecutionContext): Promise<unknown>;
}

export interface ToolExecutionContext {
  workspaceId: number;
  agentId: number;
  conversationId?: number;
  userId: number;
}

const builtinExecutors: Map<string, ToolExecutor> = new Map();

export function registerBuiltinTool(name: string, executor: ToolExecutor): void {
  builtinExecutors.set(name, executor);
}

export function getBuiltinTool(name: string): ToolExecutor | undefined {
  return builtinExecutors.get(name);
}

export async function loadWorkspaceTools(workspaceId: number): Promise<ToolDefinition[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tools)
    .where(and(eq(tools.workspaceId, workspaceId), eq(tools.enabled, true), isNull(tools.deletedAt)))
    .orderBy(desc(tools.createdAt));
  return rows.map(rowToToolDef);
}

export async function loadToolByName(workspaceId: number, name: string): Promise<ToolDefinition | null> {
  const db = await requireDb();
  const row = (
    await db
      .select()
      .from(tools)
      .where(and(eq(tools.workspaceId, workspaceId), eq(tools.name, name), isNull(tools.deletedAt)))
      .limit(1)
  )[0];
  return row ? rowToToolDef(row) : null;
}

export async function executeToolCall(
  request: ToolCallRequest,
  context: ToolExecutionContext,
  workspaceTools: ToolDefinition[]
): Promise<ToolCallResult> {
  const startTime = Date.now();
  const toolDef = workspaceTools.find(t => t.name === request.name);

  if (!toolDef) {
    return {
      toolCallId: request.id,
      name: request.name,
      result: null,
      error: `Tool "${request.name}" not found in this workspace.`,
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    let result: unknown;

    if (toolDef.handlerType === "builtin") {
      const executor = getBuiltinTool(request.name);
      if (!executor) {
        return {
          toolCallId: request.id,
          name: request.name,
          result: null,
          error: `Builtin tool "${request.name}" has no executor registered.`,
          latencyMs: Date.now() - startTime,
        };
      }
      result = await executor(request.arguments, context);
    } else if (toolDef.handlerType === "webhook") {
      result = await executeWebhookTool(toolDef, request.arguments, context);
    } else {
      return {
        toolCallId: request.id,
        name: request.name,
        result: null,
        error: `Handler type "${toolDef.handlerType}" is not yet supported.`,
        latencyMs: Date.now() - startTime,
      };
    }

    await recordToolExecution(request, context, "success", result, Date.now() - startTime);

    return {
      toolCallId: request.id,
      name: request.name,
      result,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message.slice(0, 500) : "Tool execution failed";

    await recordToolExecution(request, context, "error", null, Date.now() - startTime, errorMsg);

    return {
      toolCallId: request.id,
      name: request.name,
      result: null,
      error: errorMsg,
      latencyMs: Date.now() - startTime,
    };
  }
}

export function toolsToLLMFormat(toolDefs: ToolDefinition[]): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return toolDefs.map(t => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

async function executeWebhookTool(
  toolDef: ToolDefinition,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  const url = toolDef.handlerConfig.url as string;
  const headers = (toolDef.handlerConfig.headers as Record<string, string>) ?? {};
  const method = (toolDef.handlerConfig.method as string)?.toUpperCase() ?? "POST";

  if (!url) throw new Error("Webhook tool has no URL configured");

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ args, context }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned HTTP ${response.status}`);
  }

  return response.json();
}

async function recordToolExecution(
  request: ToolCallRequest,
  context: ToolExecutionContext,
  status: "success" | "error",
  result: unknown,
  latencyMs: number,
  error?: string
): Promise<void> {
  try {
    const db = await requireDb();
    await db.insert(toolExecutions).values({
      workspaceId: context.workspaceId,
      agentId: context.agentId,
      conversationId: context.conversationId ?? null,
      toolName: request.name,
      toolCallId: request.id,
      arguments: request.arguments,
      result: result ?? null,
      status,
      errorMessage: error ?? null,
      latencyMs,
      createdById: context.userId,
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "tool_execution_record_error", error: err }));
  }
}

function rowToToolDef(row: any): ToolDefinition {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    parameters: row.parameters ?? {},
    handlerType: row.handlerType,
    handlerConfig: row.handlerConfig ?? {},
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
