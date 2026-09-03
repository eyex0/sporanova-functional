// NOVA Model Gateway
// SOPRANOVA Intelligence Platform

import { NovaProviderRegistryImpl } from './providers';
import { NovaOpenAIProvider } from './providers/openai';
import { NovaGroqProvider } from './providers/groq';
import { NovaInvokeRequest, NovaInvokeResponse, NovaStreamRequest, NovaStreamEvent, NovaContext } from './providers/base';
import { NovaTracer } from './observability/tracer';

export class NovaGateway {
  private registry: NovaProviderRegistryImpl;
  private tracer: NovaTracer;
  private defaultProvider: string;
  private fallbackChain: string[];

  constructor() {
    this.registry = new NovaProviderRegistryImpl();
    this.tracer = new NovaTracer();
    this.defaultProvider = 'groq';
    this.fallbackChain = ['groq', 'openai'];
  }

  async initialize(): Promise<void> {
    // Register providers from environment
    if (process.env.GROQ_API_KEY) {
      const groqProvider = new NovaGroqProvider({
        name: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        models: ['qwen-qwq-32b', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
        maxContextWindow: 128000,
        pricing: { prompt: 0, completion: 0 }, // Free tier
      });
      this.registry.register(groqProvider);
    }

    if (process.env.AI_API_KEY) {
      const openaiProvider = new NovaOpenAIProvider({
        name: 'openai',
        baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com',
        apiKey: process.env.AI_API_KEY,
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        maxContextWindow: 128000,
        pricing: { prompt: 2.50, completion: 10.00 },
      });
      this.registry.register(openaiProvider);
    }
  }

  async invoke(request: NovaInvokeRequest): Promise<NovaInvokeResponse> {
    const startTime = Date.now();
    const model = request.model || 'qwen-qwq-32b';
    const providerName = request.provider || this.defaultProvider;

    // Try requested provider first
    let provider = this.registry.get(providerName);
    if (!provider || !await provider.isAvailable()) {
      // Try fallback chain
      for (const fallbackName of this.fallbackChain) {
        if (fallbackName === providerName) continue;
        const fallback = this.registry.get(fallbackName);
        if (fallback && await fallback.isAvailable()) {
          provider = fallback;
          break;
        }
      }
    }

    if (!provider) {
      throw new Error('No available provider');
    }

    try {
      const response = await provider.invoke({
        ...request,
        model,
        provider: provider.name,
      });

      // Record trace
      await this.tracer.record({
        id: response.id,
        workspaceId: request.context.workspaceId,
        agentId: request.context.agentId,
        model: response.model,
        provider: response.provider,
        usage: response.usage,
        latencyMs: response.latencyMs,
        status: 'success',
      });

      return response;
    } catch (error) {
      // Record error
      await this.tracer.record({
        id: crypto.randomUUID(),
        workspaceId: request.context.workspaceId,
        agentId: request.context.agentId,
        model,
        provider: provider.name,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        latencyMs: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  async *invokeStream(request: NovaStreamRequest): AsyncGenerator<NovaStreamEvent> {
    const model = request.model || 'qwen-qwq-32b';
    const providerName = request.provider || this.defaultProvider;

    // Try requested provider first
    let provider = this.registry.get(providerName);
    if (!provider || !await provider.isAvailable()) {
      // Try fallback chain
      for (const fallbackName of this.fallbackChain) {
        if (fallbackName === providerName) continue;
        const fallback = this.registry.get(fallbackName);
        if (fallback && await fallback.isAvailable()) {
          provider = fallback;
          break;
        }
      }
    }

    if (!provider) {
      throw new Error('No available provider');
    }

    yield* provider.invokeStream({
      ...request,
      model,
      provider: provider.name,
    });
  }

  getRegisteredProviders(): string[] {
    return this.registry.list().map(p => p.name);
  }

  async getAvailableProviders(): Promise<string[]> {
    const available = await this.registry.getAvailable();
    return available.map(p => p.name);
  }

  async getModelProvider(model: string): Promise<string | undefined> {
    const provider = await this.registry.getModelProvider(model);
    return provider?.name;
  }
}
