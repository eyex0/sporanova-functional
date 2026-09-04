import { describe, it, expect } from 'vitest';
import { MockNovaInferenceServer } from '../training/cloud/serving/inference_server';

describe('MockNovaInferenceServer', () => {
  const endpoint = {
    endpoint_id: 'ep-1',
    model_id: 'nova-v0.6',
    base_model: 'Qwen/Qwen2.5-72B-Instruct',
    engine: 'mock' as const,
    openai_compatible: true,
    max_concurrent_requests: 32,
    max_context_tokens: 8192,
    status: 'DEPLOYED' as const,
  };

  it('responds to a chat completion in OpenAI shape', async () => {
    const server = new MockNovaInferenceServer(endpoint);
    const r = await server.chatCompletion({
      model: 'nova',
      messages: [{ role: 'user', content: 'Hello, NOVA' }],
    });
    expect(r.object).toBe('chat.completion');
    expect(r.choices[0].message.role).toBe('assistant');
    expect(r.choices[0].message.content).toContain('Hello, NOVA');
    expect(r.usage.total_tokens).toBeGreaterThan(0);
  });

  it('lists the deployed models', async () => {
    const server = new MockNovaInferenceServer(endpoint);
    const models = await server.listModels();
    expect(models.find(m => m.id === 'nova-v0.6')).toBeTruthy();
    expect(models.find(m => m.id === 'Qwen/Qwen2.5-72B-Instruct')).toBeTruthy();
  });

  it('reports a healthy endpoint', async () => {
    const server = new MockNovaInferenceServer(endpoint);
    const h = await server.health();
    expect(h.ok).toBe(true);
  });
});
