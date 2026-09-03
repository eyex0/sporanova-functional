import { invokeLLM, invokeLLMStream, type InvokeParams, type InvokeResult, type Message, type Tool, type ToolChoice } from "./llm";
import { ENV } from "./env";

export type { Message, Tool, ToolChoice };

export interface ModelRequest {
  messages: Message[];
  model?: string;
  tools?: Tool[];
  toolChoice?: ToolChoice;
  maxTokens?: number;
  temperature?: number;
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  finishReason: string | null;
  usage: ModelUsage | null;
  latencyMs: number;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

export interface ModelGatewayConfig {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
}

function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function extractTextContent(content: unknown): string {
  let text = "";
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .filter((part): part is { type: "text"; text: string } =>
        typeof part === "object" && part !== null && "type" in part &&
        (part as { type?: unknown }).type === "text" &&
        "text" in part && typeof (part as { text?: unknown }).text === "string"
      )
      .map(part => part.text)
      .join("\n");
  }
  return stripThinkingTags(text);
}

function resolveModel(requestedModel?: string): string {
  return requestedModel || ENV.ai.model || "gpt-4o-mini";
}

function resolveProvider(): string {
  return ENV.ai.provider || "openai-compatible";
}

export async function modelGatewayInvoke(request: ModelRequest): Promise<ModelResponse> {
  const startTime = Date.now();
  const model = resolveModel(request.model);
  const provider = resolveProvider();

  const invokeParams: InvokeParams = {
    messages: request.messages,
    model,
    maxTokens: request.maxTokens,
  };

  if (request.tools && request.tools.length > 0) {
    invokeParams.tools = request.tools;
  }
  if (request.toolChoice) {
    invokeParams.toolChoice = request.toolChoice;
  }

  const result: InvokeResult = await invokeLLM(invokeParams);
  const latencyMs = Date.now() - startTime;

  const choice = result.choices?.[0];
  const messageContent = choice?.message?.content;
  const content = extractTextContent(messageContent);

  const toolCalls = choice?.message?.tool_calls?.map(tc => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));

  const usage: ModelUsage | null = result.usage
    ? {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      }
    : null;

  return {
    id: result.id,
    model: result.model || model,
    provider,
    content,
    finishReason: choice?.finish_reason ?? null,
    usage,
    latencyMs,
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
  };
}

export async function modelGatewayInvokeStream(request: ModelRequest): Promise<{
  stream: ReadableStream<Uint8Array>;
  model: string;
  provider: string;
}> {
  const model = resolveModel(request.model);
  const provider = resolveProvider();

  const invokeParams: InvokeParams = {
    messages: request.messages,
    model,
    maxTokens: request.maxTokens,
  };

  if (request.tools && request.tools.length > 0) {
    invokeParams.tools = request.tools;
  }
  if (request.toolChoice) {
    invokeParams.toolChoice = request.toolChoice;
  }

  const stream = await invokeLLMStream(invokeParams);

  return { stream, model, provider };
}
