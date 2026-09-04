# Model Serving

## Inference Server Interface

The `NovaInferenceServer` interface provides an OpenAI-compatible API surface
that can be backed by vLLM, TGI, or the mock.

```typescript
interface NovaInferenceServer {
  readonly engine: string;
  readonly endpoint: InferenceEndpoint;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  listModels(): Promise<Array<{ id: string; owned_by: string }>>;
  health(): Promise<{ ok: boolean; gpu_utilization?: number; vram_gb_used?: number }>;
}
```

## Chat Completion Shape

```typescript
// Request
{
  model: 'nova-v0.6',
  messages: [{ role: 'user', content: '...' }],
  temperature?: number,
  max_tokens?: number,
}

// Response (OpenAI-compatible)
{
  id: 'cmpl-...',
  object: 'chat.completion',
  choices: [{ message: { role: 'assistant', content: '...' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: N, completion_tokens: N, total_tokens: N },
}
```

## Engine Support

| Engine | Status | Notes |
|--------|--------|-------|
| Mock | Working | Echoes back user content, deterministic |
| vLLM | Stub | Production-grade, supports continuous batching |
| TGI | Stub | HuggingFace text-generation-inference |
| Transformers | Stub | Native HuggingFace, lower throughput |

## Health Check

```typescript
const health = await server.health();
// { ok: true, gpu_utilization: 0.85, vram_gb_used: 68 }
```

## Integration with NOVA Gateway

The `NovaGateway` in `server/_core/nova/gateway.ts` routes `model=NOVA`
requests through the inference server when a real checkpoint is available.
Falls back to the Qwen3.6-27B-Groq provider when no NOVA checkpoint exists.
