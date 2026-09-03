// NOVA Provider Interface
// SOPRANOVA Intelligence Platform

export interface NovaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | NovaContentPart[];
  toolCallId?: string;
  toolCalls?: NovaToolCall[];
  name?: string;
}

export type NovaContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface NovaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
    strict?: boolean;
  };
}

export interface NovaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface NovaContext {
  workspaceId: string;
  agentId: string;
  userId: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface NovaUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface NovaInvokeRequest {
  messages: NovaMessage[];
  model?: string;
  provider?: string;
  tools?: NovaTool[];
  toolChoice?: 'none' | 'auto' | 'required' | { name: string };
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  responseFormat?: {
    type: 'text' | 'json_object' | 'json_schema';
    schema?: Record<string, any>;
  };
  context: NovaContext;
}

export interface NovaInvokeResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  toolCalls?: NovaToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: NovaUsage;
  latencyMs: number;
}

export interface NovaStreamRequest {
  messages: NovaMessage[];
  model?: string;
  provider?: string;
  tools?: NovaTool[];
  toolChoice?: 'none' | 'auto' | 'required' | { name: string };
  maxTokens?: number;
  temperature?: number;
  context: NovaContext;
}

export type NovaStreamEvent = 
  | { type: 'content'; content: string }
  | { type: 'tool_call'; toolCall: NovaToolCall }
  | { type: 'done'; usage: NovaUsage }
  | { type: 'error'; error: string };

export interface NovaProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  maxContextWindow: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export abstract class NovaProvider {
  protected config: NovaProviderConfig;

  constructor(config: NovaProviderConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get models(): string[] {
    return this.config.models;
  }

  abstract invoke(request: NovaInvokeRequest): Promise<NovaInvokeResponse>;
  abstract invokeStream(request: NovaStreamRequest): AsyncGenerator<NovaStreamEvent>;
  abstract isAvailable(): Promise<boolean>;
}

export interface NovaProviderRegistry {
  register(provider: NovaProvider): void;
  get(name: string): NovaProvider | undefined;
  list(): NovaProvider[];
  getAvailable(): Promise<NovaProvider[]>;
}
