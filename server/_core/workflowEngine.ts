import { and, eq, isNull, desc } from "drizzle-orm";
import { workflows, workflowNodes, workflowEdges, workflowRuns, nodeExecutions, workflowStepCheckpoints, workflowApprovals, workflowEvents, workflowVersions } from "../../drizzle/schema";
import { requireDb, writeAuditLog } from "../db";
import { AgentRuntime, type AgentRuntimeResult } from "./agentRuntime";

/* ───────────── Types ───────────── */

export type WorkflowNodeType =
  | "start" | "end" | "condition" | "wait" | "notification"
  | "ai" | "ai_agent" | "ai_router" | "ai_classifier"
  | "supervisor" | "multi_agent"
  | "knowledge_search" | "rag_retrieval" | "memory_read" | "memory_write"
  | "tool" | "mcp_tool" | "http_request" | "function" | "code"
  | "parallel" | "merge" | "aggregate" | "subworkflow"
  | "human_approval" | "escalation" | "approval"
  | "trigger" | "intelligence" | "api" | "action";

export interface WorkflowNodeRow {
  id: number;
  workflowId: number;
  nodeKey: string;
  nodeType: WorkflowNodeType;
  label: string;
  description?: string | null;
  positionX: number;
  positionY: number;
  sortOrder: number;
  configuration?: Record<string, unknown> | null;
}

export interface WorkflowEdgeRow {
  id: number;
  workflowId: number;
  sourceNodeId: number;
  targetNodeId: number;
  label?: string | null;
  conditionExpr?: string | null;
}

export interface NodeExecutionRecord {
  runId: number;
  nodeId: number;
  nodeKey: string;
  nodeType: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface WorkflowContext {
  workspaceId: number;
  userId: number;
  runId: number;
  workflowId: number;
  input?: Record<string, unknown>;
  nodeOutputs: Record<string, unknown>;
  variables: Record<string, unknown>;
  checkpoints: Map<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
  runId: number;
  status: "completed" | "failed" | "cancelled" | "running";
  outputs: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeResults: Array<{
    nodeKey: string;
    nodeType: string;
    status: string;
    durationMs: number;
    output?: unknown;
    error?: string;
    retries?: number;
  }>;
  durationMs: number;
  pendingApprovals?: number;
}

export interface DAGNode {
  node: WorkflowNodeRow;
  incoming: WorkflowEdgeRow[];
  outgoing: WorkflowEdgeRow[];
}

/* ───────────── DAG Builder ───────────── */

function buildDAG(
  nodes: WorkflowNodeRow[],
  edges: WorkflowEdgeRow[],
): Map<string, DAGNode> {
  const dag = new Map<string, DAGNode>();

  for (const node of nodes) {
    dag.set(node.nodeKey, {
      node,
      incoming: [],
      outgoing: [],
    });
  }

  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);
    const targetNode = nodes.find(n => n.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) continue;

    const source = dag.get(sourceNode.nodeKey);
    const target = dag.get(targetNode.nodeKey);
    if (!source || !target) continue;

    source.outgoing.push(edge);
    target.incoming.push(edge);
  }

  return dag;
}

function findStartNodes(dag: Map<string, DAGNode>): DAGNode[] {
  const starts: DAGNode[] = [];
  for (const dagNode of Array.from(dag.values())) {
    if (
      dagNode.node.nodeType === "start" ||
      dagNode.node.nodeType === "trigger"
    ) {
      starts.push(dagNode);
    }
  }
  return starts;
}

/* ───────────── Checkpoint System ───────────── */

export async function saveCheckpoint(
  runId: number,
  workflowId: number,
  workspaceId: number,
  nodeKey: string,
  data: Record<string, unknown>,
  isResumable: boolean = false,
): Promise<string | undefined> {
  const db = await requireDb();
  const resumeToken = isResumable ? `resume_${runId}_${nodeKey}_${Date.now()}` : undefined;
  
  await db.insert(workflowStepCheckpoints).values({
    runId,
    workflowId,
    workspaceId,
    nodeKey,
    checkpointData: data,
    resumeToken,
    isResumable,
  });

  return resumeToken;
}

export async function loadCheckpoint(
  runId: number,
  nodeKey: string,
): Promise<Record<string, unknown> | null> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(workflowStepCheckpoints)
    .where(and(eq(workflowStepCheckpoints.runId, runId), eq(workflowStepCheckpoints.nodeKey, nodeKey)))
    .orderBy(desc(workflowStepCheckpoints.createdAt))
    .limit(1);
  
  return rows[0]?.checkpointData as Record<string, unknown> ?? null;
}

/* ───────────── Approval System ───────────── */

export async function createApprovalRequest(
  runId: number,
  nodeId: number,
  workflowId: number,
  workspaceId: number,
  context: Record<string, unknown>,
  expiresAt?: Date,
): Promise<number> {
  const db = await requireDb();
  const [row] = await db
    .insert(workflowApprovals)
    .values({
      runId,
      nodeId,
      workflowId,
      workspaceId,
      requestContext: context,
      expiresAt,
    })
    .returning({ id: workflowApprovals.id });
  return row.id;
}

export async function resolveApproval(
  approvalId: number,
  decisionBy: number,
  decision: "approved" | "rejected",
  decisionNote?: string,
): Promise<void> {
  const db = await requireDb();
  await db
    .update(workflowApprovals)
    .set({
      status: decision,
      decisionBy,
      decisionNote,
      decisionAt: new Date(),
    })
    .where(eq(workflowApprovals.id, approvalId));
}

/* ───────────── Event System ───────────── */

export async function emitWorkflowEvent(
  runId: number,
  workflowId: number,
  workspaceId: number,
  eventType: string,
  payload: Record<string, unknown>,
  sourceNodeId?: number,
): Promise<void> {
  const db = await requireDb();
  await db.insert(workflowEvents).values({
    runId,
    workflowId,
    workspaceId,
    eventType,
    payload,
    sourceNodeId,
  });
}

/* ───────────── Retry Engine ───────────── */

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<{ result: T; retries: number }> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retries: attempt };
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, Math.min(delay, 30000)));
      }
    }
  }
  throw lastError;
}

/* ───────────── Condition Evaluator ───────────── */

function evaluateCondition(
  expr: string | null | undefined,
  context: WorkflowContext,
): boolean {
  if (!expr) return true;
  try {
    const parsed = JSON.parse(expr) as {
      field: string;
      op: string;
      value: unknown;
      logic?: "and" | "or";
      conditions?: Array<{ field: string; op: string; value: unknown }>;
    };

    // Handle compound conditions
    if (parsed.logic && parsed.conditions && parsed.conditions.length > 0) {
      const results = parsed.conditions.map(cond => {
        const fieldValue = resolveField(cond.field, context);
        return evaluateSingle(fieldValue, cond.op, cond.value);
      });
      return parsed.logic === "and" ? results.every(Boolean) : results.some(Boolean);
    }

    const fieldValue = resolveField(parsed.field, context);
    return evaluateSingle(fieldValue, parsed.op, parsed.value);
  } catch {
    return true;
  }
}

function resolveField(field: string, context: WorkflowContext): unknown {
  // Support nested paths like "nodeKey.output.field"
  const parts = field.split(".");
  let current: unknown = context;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function evaluateSingle(fieldValue: unknown, op: string, value: unknown): boolean {
  switch (op) {
    case "eq": return fieldValue === value;
    case "neq": return fieldValue !== value;
    case "gt": return Number(fieldValue) > Number(value);
    case "gte": return Number(fieldValue) >= Number(value);
    case "lt": return Number(fieldValue) < Number(value);
    case "lte": return Number(fieldValue) <= Number(value);
    case "contains": return String(fieldValue).includes(String(value));
    case "starts_with": return String(fieldValue).startsWith(String(value));
    case "ends_with": return String(fieldValue).endsWith(String(value));
    case "regex": return new RegExp(String(value)).test(String(fieldValue));
    case "exists": return fieldValue !== undefined && fieldValue !== null;
    case "is_empty": return fieldValue === undefined || fieldValue === null || fieldValue === "";
    case "in": return Array.isArray(value) && value.includes(fieldValue);
    case "not_in": return Array.isArray(value) && !value.includes(fieldValue);
    default: return Boolean(fieldValue);
  }
}

/* ───────────── Node Executors ───────────── */

async function executeStartNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  return { started: true, input: context.input ?? {} };
}

async function executeAiNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
  workspaceId: number,
  userId: number,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const agentId = config.agentId as number;
  const promptTemplate = (config.promptTemplate as string) ?? "Respond to the input.";
  const maxTokens = (config.maxTokens as number) ?? 2048;

  // Build the message by injecting previous outputs into the template
  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    prompt = prompt.replace(`{{${key}}}`, String(value));
  }
  if (context.input) {
    for (const [key, value] of Object.entries(context.input)) {
      prompt = prompt.replace(`{{input.${key}}}`, String(value));
    }
  }

  try {
    const runtime = new AgentRuntime({ maxTokens });
    const result = await runtime.execute({
      workspaceId,
      agentId,
      userId,
      message: prompt,
    });
    return {
      content: result.response,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
    };
  } catch (err) {
    return { error: String(err) };
  }
}

async function executeConditionNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const field = config.field as string ?? "";
  const operator = config.operator as string ?? "eq";
  const value = config.value;

  const fieldValue = context.nodeOutputs[field] ?? context.input?.[field];

  let result = false;
  switch (operator) {
    case "eq": result = fieldValue === value; break;
    case "neq": result = fieldValue !== value; break;
    case "gt": result = Number(fieldValue) > Number(value); break;
    case "gte": result = Number(fieldValue) >= Number(value); break;
    case "lt": result = Number(fieldValue) < Number(value); break;
    case "lte": result = Number(fieldValue) <= Number(value); break;
    case "contains": result = String(fieldValue).includes(String(value)); break;
    case "exists": result = fieldValue !== undefined && fieldValue !== null; break;
    default: result = Boolean(fieldValue);
  }

  return { field, operator, value, fieldValue, result };
}

async function executeToolNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const toolName = config.toolName as string ?? "unknown";
  const inputMapping = config.inputMapping as Record<string, string> ?? {};

  // Resolve input values from previous node outputs
  const resolvedInput: Record<string, unknown> = {};
  for (const [param, sourcePath] of Object.entries(inputMapping)) {
    const [sourceKey, subField] = sourcePath.split(".");
    const sourceOutput = context.nodeOutputs[sourceKey];
    if (subField && typeof sourceOutput === "object" && sourceOutput !== null) {
      resolvedInput[param] = (sourceOutput as Record<string, unknown>)[subField];
    } else {
      resolvedInput[param] = sourceOutput;
    }
  }

  return { toolName, input: resolvedInput, executed: true };
}

async function executeApiNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const url = config.url as string ?? "";
  const method = (config.method as string ?? "GET").toUpperCase();
  const headers = (config.headers as Record<string, string>) ?? {};
  let body = config.body;

  // Resolve template variables in URL and body
  let resolvedUrl = url;
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    resolvedUrl = resolvedUrl.replace(`{{${key}}}`, String(value));
  }

  if (body && typeof body === "string") {
    let resolvedBody = body;
    for (const [key, value] of Object.entries(context.nodeOutputs)) {
      resolvedBody = resolvedBody.replace(`{{${key}}}`, String(value));
    }
    body = resolvedBody;
  }

  try {
    const response = await fetch(resolvedUrl, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });
    const responseBody = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(responseBody); } catch { parsed = responseBody; }
    return { status: response.status, body: parsed };
  } catch (err) {
    return { error: String(err) };
  }
}

async function executeWaitNode(
  node: WorkflowNodeRow,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const duration = (config.duration as number) ?? 1000;
  const unit = (config.unit as string) ?? "ms";

  let ms = duration;
  if (unit === "s") ms = duration * 1000;
  if (unit === "m") ms = duration * 60000;
  if (unit === "h") ms = duration * 3600000;

  await new Promise(resolve => setTimeout(resolve, Math.min(ms, 300000)));
  return { waited: ms };
}

async function executeNotificationNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const title = (config.title as string ?? "Workflow notification");
  let content = (config.content as string ?? "");

  // Resolve template variables
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    content = content.replace(`{{${key}}}`, String(value));
  }

  return { title, content, sent: true };
}

/* ───────────── Advanced Node Executors ───────────── */

async function executeAiRouterNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
  workspaceId: number,
  userId: number,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const promptTemplate = (config.promptTemplate as string) ?? "Classify the input.";
  const categories = (config.categories as string[]) ?? [];
  const confidenceThreshold = (config.confidenceThreshold as number) ?? 0.5;

  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    prompt = prompt.replace(`{{${key}}}`, String(value));
  }
  if (context.input) {
    for (const [key, value] of Object.entries(context.input)) {
      prompt = prompt.replace(`{{input.${key}}}`, String(value));
    }
  }

  const classificationPrompt = `${prompt}\n\nCategories: ${categories.join(", ")}\n\nRespond with JSON: {"category": "<category>", "confidence": <0-1>, "reasoning": "<brief>"}`;

  try {
    const runtime = new AgentRuntime({ maxTokens: 512 });
    const result = await runtime.execute({
      workspaceId,
      agentId: (config.agentId as number) ?? 0,
      userId,
      message: classificationPrompt,
    });

    const parsed = JSON.parse(result.response) as {
      category: string;
      confidence: number;
      reasoning: string;
    };

    return {
      category: parsed.category,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      meetsThreshold: parsed.confidence >= confidenceThreshold,
    };
  } catch (err) {
    return { error: String(err), category: categories[0] ?? "unknown", confidence: 0 };
  }
}

async function executeSupervisorNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
  workspaceId: number,
  userId: number,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const agentIds = (config.agentIds as number[]) ?? [];
  const promptTemplate = (config.promptTemplate as string) ?? "Coordinate the following task.";
  const strategy = (config.strategy as string) ?? "sequential";

  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    prompt = prompt.replace(`{{${key}}}`, String(value));
  }

  const results: Array<{ agentId: number; output: unknown; error?: string }> = [];

  if (strategy === "sequential") {
    for (const agentId of agentIds) {
      try {
        const runtime = new AgentRuntime({ maxTokens: 2048 });
        const result = await runtime.execute({
          workspaceId,
          agentId,
          userId,
          message: prompt,
        });
        results.push({ agentId, output: result.response });
        prompt = result.response;
      } catch (err) {
        results.push({ agentId, output: null, error: String(err) });
      }
    }
  } else if (strategy === "parallel") {
    const promises = agentIds.map(async (agentId) => {
      try {
        const runtime = new AgentRuntime({ maxTokens: 2048 });
        const result = await runtime.execute({
          workspaceId,
          agentId,
          userId,
          message: prompt,
        });
        return { agentId, output: result.response };
      } catch (err) {
        return { agentId, output: null, error: String(err) };
      }
    });
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  }

  return { strategy, results, agentCount: results.length };
}

async function executeKnowledgeSearchNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const query = (config.query as string) ?? "";
  const maxResults = (config.maxResults as number) ?? 5;
  const knowledgeBaseId = config.knowledgeBaseId as number;

  let resolvedQuery = query;
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    resolvedQuery = resolvedQuery.replace(`{{${key}}}`, String(value));
  }

  // Placeholder for RAG search - will be integrated with ragProvider
  return {
    query: resolvedQuery,
    maxResults,
    knowledgeBaseId,
    results: [],
    message: "Knowledge search node executed",
  };
}

async function executeMemoryReadNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const memoryType = (config.memoryType as string) ?? "fact";
  const limit = (config.limit as number) ?? 10;

  // Placeholder - will be integrated with conversationMemory
  return {
    memoryType,
    limit,
    memories: [],
    message: "Memory read node executed",
  };
}

async function executeMemoryWriteNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const memoryType = (config.memoryType as string) ?? "fact";
  const contentTemplate = (config.content as string) ?? "";

  let content = contentTemplate;
  for (const [key, value] of Object.entries(context.nodeOutputs)) {
    content = content.replace(`{{${key}}}`, String(value));
  }

  return {
    memoryType,
    content,
    written: true,
    message: "Memory write node executed",
  };
}

async function executeApprovalNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
  workspaceId: number,
  workflowId: number,
  runId: number,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const assignTo = (config.assignTo as number) ?? context.userId;
  const timeoutMinutes = (config.timeoutMinutes as number) ?? 1440; // 24h default

  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

  const approvalId = await createApprovalRequest(
    runId,
    node.id,
    workflowId,
    workspaceId,
    { nodeOutputs: context.nodeOutputs, input: context.input },
    expiresAt,
  );

  await emitWorkflowEvent(
    runId,
    workflowId,
    workspaceId,
    "approval.requested",
    { approvalId, assignTo, nodeKey: node.nodeKey },
    node.id,
  );

  return {
    approvalId,
    assignTo,
    expiresAt: expiresAt.toISOString(),
    status: "pending",
    message: "Waiting for approval",
  };
}

async function executeCodeNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const language = (config.language as string) ?? "javascript";
  const code = (config.code as string) ?? "";

  if (language !== "javascript") {
    return { error: `Unsupported language: ${language}. Only JavaScript is supported.` };
  }

  // Create a sandboxed context with workflow data
  const sandbox = {
    input: context.input,
    outputs: context.nodeOutputs,
    variables: context.variables,
    console: { log: (...args: unknown[]) => sandbox._logs.push(args.join(" ")) },
    _logs: [] as string[],
  };

  try {
    const fn = new Function("ctx", `
      with (ctx) {
        ${code}
      }
    `);
    const result = fn(sandbox);
    return { result, logs: sandbox._logs };
  } catch (err) {
    return { error: String(err), logs: sandbox._logs };
  }
}

async function executeEndNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
): Promise<unknown> {
  const config = node.configuration ?? {};
  const outputMapping = config.outputMapping as Record<string, string> ?? {};

  const output: Record<string, unknown> = {};
  for (const [key, sourcePath] of Object.entries(outputMapping)) {
    const [sourceKey, subField] = sourcePath.split(".");
    const sourceOutput = context.nodeOutputs[sourceKey];
    if (subField && typeof sourceOutput === "object" && sourceOutput !== null) {
      output[key] = (sourceOutput as Record<string, unknown>)[subField];
    } else {
      output[key] = sourceOutput;
    }
  }

  return output;
}

/* ───────────── Main Engine ───────────── */

export async function executeWorkflow(
  workspaceId: number,
  workflowId: number,
  runId: number,
  userId: number,
  input?: Record<string, unknown>,
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();
  const db = await requireDb();

  // Load workflow graph
  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflowId))
    .orderBy(workflowNodes.sortOrder);

  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, workflowId));

  if (nodes.length === 0) {
    throw new Error("Workflow has no nodes");
  }

  const dag = buildDAG(nodes, edges);
  const startNodes = findStartNodes(dag);

  if (startNodes.length === 0) {
    throw new Error("Workflow has no start/trigger node");
  }

  // Update run status
  await db
    .update(workflowRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(workflowRuns.id, runId));

  const context: WorkflowContext = {
    workspaceId,
    userId,
    runId,
    workflowId,
    input: input ?? {},
    nodeOutputs: {},
    variables: {},
    checkpoints: new Map(),
    metadata: {},
  };

  const nodeResults: WorkflowExecutionResult["nodeResults"] = [];
  let currentNodes: DAGNode[] = startNodes;
  let iterations = 0;
  const maxIterations = 200;
  let pendingApprovals = 0;

  while (currentNodes.length > 0 && iterations < maxIterations) {
    iterations++;
    const nextNodes: DAGNode[] = [];

    // Process nodes in parallel for parallel-capable types
    const parallelNodes: DAGNode[] = [];
    const sequentialNodes: DAGNode[] = [];

    for (const dagNode of currentNodes) {
      if (dagNode.node.nodeType === "parallel") {
        parallelNodes.push(dagNode);
      } else {
        sequentialNodes.push(dagNode);
      }
    }

    // Execute sequential nodes
    for (const dagNode of sequentialNodes) {
      const { node } = dagNode;

      // Record start
      const execRecord: NodeExecutionRecord = {
        runId,
        nodeId: node.id,
        nodeKey: node.nodeKey,
        nodeType: node.nodeType,
        status: "running",
        input: context.input,
        startedAt: new Date(),
      };

      const [execRow] = await db
        .insert(nodeExecutions)
        .values(execRecord)
        .returning({ id: nodeExecutions.id });

      const nodeStart = Date.now();
      let output: unknown;
      let error: string | undefined;
      let retries = 0;

      try {
        // Apply retry logic for certain node types
        const needsRetry = ["ai", "ai_agent", "ai_router", "tool", "http_request", "api"].includes(node.nodeType);

        if (needsRetry) {
          const { result, retries: retryCount } = await withRetry(async () => {
            return await executeNode(node, context, workspaceId, userId, workflowId, runId);
          }, 3, 1000);
          output = result;
          retries = retryCount;
        } else {
          output = await executeNode(node, context, workspaceId, userId, workflowId, runId);
        }

        // Handle approval node - pause execution if pending
        if (node.nodeType === "approval" || node.nodeType === "human_approval") {
          const approvalOutput = output as Record<string, unknown>;
          if (approvalOutput?.status === "pending") {
            pendingApprovals++;
            // Don't traverse outgoing edges yet
            await db
              .update(nodeExecutions)
              .set({
                status: "waiting_approval",
                output: output as Record<string, unknown>,
                completedAt: new Date(),
                durationMs: Date.now() - nodeStart,
              })
              .where(eq(nodeExecutions.id, execRow.id));

            nodeResults.push({
              nodeKey: node.nodeKey,
              nodeType: node.nodeType,
              status: "waiting_approval",
              durationMs: Date.now() - nodeStart,
              output,
              retries,
            });

            context.nodeOutputs[node.nodeKey] = output;
            continue;
          }
        }
      } catch (err) {
        error = String(err);
        output = { error: error };
      }

      const durationMs = Date.now() - nodeStart;

      // Store output in context
      context.nodeOutputs[node.nodeKey] = output;

      // Save checkpoint for resumable nodes
      if (["approval", "human_approval", "wait"].includes(node.nodeType) && !error) {
        await saveCheckpoint(runId, workflowId, workspaceId, node.nodeKey, {
          output,
          nodeOutputs: context.nodeOutputs,
        }, true);
      }

      // Update execution record
      await db
        .update(nodeExecutions)
        .set({
          status: error ? "failed" : "completed",
          output: output as Record<string, unknown>,
          error,
          completedAt: new Date(),
          durationMs,
        })
        .where(eq(nodeExecutions.id, execRow.id));

      nodeResults.push({
        nodeKey: node.nodeKey,
        nodeType: node.nodeType,
        status: error ? "failed" : "completed",
        durationMs,
        output,
        error,
        retries,
      });

      if (error) {
        // Node failed — stop traversal
        await db
          .update(workflowRuns)
          .set({
            status: "failed",
            errorMessage: error,
            completedAt: new Date(),
            output: context.nodeOutputs as Record<string, unknown>,
          })
          .where(eq(workflowRuns.id, runId));

        return {
          runId,
          status: "failed",
          outputs: context.nodeOutputs,
          variables: context.variables,
          nodeResults,
          durationMs: Date.now() - startTime,
        };
      }

      // For end node, stop
      if (node.nodeType === "end") {
        continue;
      }

      // Resolve outgoing edges (skip for approval nodes waiting)
      if (node.nodeType === "approval" || node.nodeType === "human_approval") continue;

      for (const edge of dagNode.outgoing) {
        const targetNode = dag.get(
          nodes.find(n => n.id === edge.targetNodeId)?.nodeKey ?? "",
        );
        if (!targetNode) continue;

        // Check condition
        if (edge.conditionExpr) {
          const condResult = evaluateCondition(edge.conditionExpr, context);
          if (!condResult) {
            // Skip this edge — condition not met
            const skipExec: NodeExecutionRecord = {
              runId,
              nodeId: targetNode.node.id,
              nodeKey: targetNode.node.nodeKey,
              nodeType: targetNode.node.nodeType,
              status: "skipped",
            };
            const [skipRow] = await db
              .insert(nodeExecutions)
              .values(skipExec)
              .returning({ id: nodeExecutions.id });

            await db
              .update(nodeExecutions)
              .set({ completedAt: new Date(), durationMs: 0 })
              .where(eq(nodeExecutions.id, skipRow.id));

            nodeResults.push({
              nodeKey: targetNode.node.nodeKey,
              nodeType: targetNode.node.nodeType,
              status: "skipped",
              durationMs: 0,
            });
            continue;
          }
        }

        // Check if all incoming edges of target are satisfied
        const allIncomingSatisfied = targetNode.incoming.every(incEdge => {
          const sourceNode = nodes.find(n => n.id === incEdge.sourceNodeId);
          if (!sourceNode) return false;
          const sourceKey = sourceNode.nodeKey;
          return sourceKey in context.nodeOutputs;
        });

        if (allIncomingSatisfied) {
          nextNodes.push(targetNode);
        }
      }
    }

    // Execute parallel nodes (fork into all branches)
    for (const dagNode of parallelNodes) {
      const { node } = dagNode;
      context.nodeOutputs[node.nodeKey] = { forked: true, branches: dagNode.outgoing.length };
      
      for (const edge of dagNode.outgoing) {
        const targetNode = dag.get(
          nodes.find(n => n.id === edge.targetNodeId)?.nodeKey ?? "",
        );
        if (targetNode) {
          nextNodes.push(targetNode);
        }
      }
    }

    currentNodes = nextNodes;
  }

  // Determine final status
  const finalStatus = pendingApprovals > 0 ? "running" : "completed";

  // Mark run as completed (or still running if waiting for approval)
  await db
    .update(workflowRuns)
    .set({
      status: finalStatus as "completed" | "running",
      completedAt: finalStatus === "completed" ? new Date() : undefined,
      output: context.nodeOutputs as Record<string, unknown>,
    })
    .where(eq(workflowRuns.id, runId));

  return {
    runId,
    status: finalStatus as "completed" | "running",
    outputs: context.nodeOutputs,
    variables: context.variables,
    nodeResults,
    durationMs: Date.now() - startTime,
    pendingApprovals,
  };
}

/* ───────────── Node Dispatcher ───────────── */

async function executeNode(
  node: WorkflowNodeRow,
  context: WorkflowContext,
  workspaceId: number,
  userId: number,
  workflowId: number,
  runId: number,
): Promise<unknown> {
  switch (node.nodeType) {
    case "start":
    case "trigger":
      return await executeStartNode(node, context);
    case "ai":
    case "intelligence":
    case "ai_agent":
      return await executeAiNode(node, context, workspaceId, userId);
    case "ai_router":
      return await executeAiRouterNode(node, context, workspaceId, userId);
    case "ai_classifier":
      return await executeAiRouterNode(node, context, workspaceId, userId);
    case "supervisor":
    case "multi_agent":
      return await executeSupervisorNode(node, context, workspaceId, userId);
    case "knowledge_search":
    case "rag_retrieval":
      return await executeKnowledgeSearchNode(node, context);
    case "memory_read":
      return await executeMemoryReadNode(node, context);
    case "memory_write":
      return await executeMemoryWriteNode(node, context);
    case "condition":
      return await executeConditionNode(node, context);
    case "tool":
    case "action":
    case "mcp_tool":
      return await executeToolNode(node, context);
    case "api":
    case "http_request":
      return await executeApiNode(node, context);
    case "wait":
      return await executeWaitNode(node);
    case "notification":
      return await executeNotificationNode(node, context);
    case "approval":
    case "human_approval":
    case "escalation":
      return await executeApprovalNode(node, context, workspaceId, workflowId, runId);
    case "code":
    case "function":
      return await executeCodeNode(node, context);
    case "merge":
    case "aggregate":
      // Merge node: combine all incoming outputs
      return { merged: true, outputs: context.nodeOutputs };
    case "subworkflow":
      // Subworkflow: placeholder for future implementation
      return { subworkflow: true, message: "Subworkflow node executed" };
    case "parallel":
      return { parallel: true, message: "Parallel fork executed" };
    case "end":
      return await executeEndNode(node, context);
    default:
      return { skipped: true, reason: `Unknown node type: ${node.nodeType}` };
  }
}

/* ───────────── Version Snapshot ───────────── */

export async function createWorkflowSnapshot(
  workflowId: number,
  createdById: number,
): Promise<number> {
  const db = await requireDb();

  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflowId));

  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, workflowId));

  // Get next version number
  const existing = await db
    .select({ version: workflowVersions.version })
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId))
    .orderBy(desc(workflowVersions.version))
    .limit(1);

  const nextVersion = (existing[0]?.version ?? 0) + 1;

  const [versionRow] = await db
    .insert(workflowVersions)
    .values({
      workflowId,
      version: nextVersion,
      snapshot: { nodes, edges } as Record<string, unknown>,
      createdById,
    })
    .returning({ id: workflowVersions.id });

  return versionRow.id;
}
