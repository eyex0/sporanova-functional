// NOVA Inference Server Abstraction
// OpenAI-compatible interface that can be backed by vLLM, TGI, transformers,
// or a mock. Used by the NOVA gateway once a real checkpoint is available.

import { InferenceEndpoint } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;                // e.g. "nova" or "Qwen/Qwen2.5-72B-Instruct"
  messages: ChatMessage[];
  tools?: Array<{ name: string; description: string; parameters: any }>;
  tool_choice?: 'auto' | 'none' | { name: string };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
  user?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

export interface NovaInferenceServer {
  readonly engine: 'vllm' | 'tgi' | 'transformers' | 'mock';
  readonly endpoint: InferenceEndpoint;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  listModels(): Promise<Array<{ id: string; owned_by: string }>>;
  health(): Promise<{ ok: boolean; gpu_utilization?: number; vram_gb_used?: number }>;
}

export class MockNovaInferenceServer implements NovaInferenceServer {
  readonly engine = 'mock' as const;
  readonly endpoint: InferenceEndpoint;

  constructor(endpoint: InferenceEndpoint) {
    this.endpoint = endpoint;
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Mock: simply echo the last user message wrapped in a deterministic prefix.
    const lastUser = [...req.messages].reverse().find(m => m.role === 'user');
    const text = lastUser?.content ?? '';
    const reply = `[mock:${this.endpoint.model_id}] ${text.slice(0, 200)}`;
    return {
      id: `mockcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: req.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: reply },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: req.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0),
        completion_tokens: Math.ceil(reply.length / 4),
        total_tokens: req.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0) + Math.ceil(reply.length / 4),
      },
    };
  }

  async listModels(): Promise<Array<{ id: string; owned_by: string }>> {
    return [
      { id: this.endpoint.model_id, owned_by: 'sopranova' },
      { id: this.endpoint.base_model, owned_by: 'qwen' },
    ];
  }

  async health(): Promise<{ ok: boolean; gpu_utilization?: number; vram_gb_used?: number }> {
    return { ok: true, gpu_utilization: 0, vram_gb_used: 0 };
  }
}
