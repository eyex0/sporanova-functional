// NOVA Groq Provider
// SOPRANOVA Intelligence Platform

import { NovaProvider, NovaInvokeRequest, NovaInvokeResponse, NovaStreamRequest, NovaStreamEvent, NovaProviderConfig } from './base';

export class NovaGroqProvider extends NovaProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: NovaProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
    this.apiKey = config.apiKey;
  }

  async invoke(request: NovaInvokeRequest): Promise<NovaInvokeResponse> {
    const startTime = Date.now();
    const model = request.model || 'qwen-qwq-32b';

    const payload = {
      model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        tool_call_id: msg.toolCallId,
        tool_calls: msg.toolCalls,
        name: msg.name,
      })),
      tools: request.tools,
      tool_choice: request.toolChoice,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      stop: request.stop,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      id: data.id,
      model: data.model,
      provider: this.name,
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        estimatedCost: 0, // Groq has free tier
      },
      latencyMs,
    };
  }

  async *invokeStream(request: NovaStreamRequest): AsyncGenerator<NovaStreamEvent> {
    const model = request.model || 'qwen-qwq-32b';

    const payload = {
      model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        tool_call_id: msg.toolCallId,
        tool_calls: msg.toolCalls,
        name: msg.name,
      })),
      tools: request.tools,
      tool_choice: request.toolChoice,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const chunk = JSON.parse(data);
              const choice = chunk.choices[0];
              if (choice.delta.content) {
                yield { type: 'content', content: choice.delta.content };
              }
              if (choice.delta.tool_calls) {
                for (const toolCall of choice.delta.tool_calls) {
                  yield {
                    type: 'tool_call',
                    toolCall: {
                      id: toolCall.id,
                      type: 'function',
                      function: {
                        name: toolCall.function.name,
                        arguments: toolCall.function.arguments,
                      },
                    },
                  };
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
