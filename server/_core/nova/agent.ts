// NOVA Agent Intelligence & Execution Loop
// SOPRANOVA Intelligence Platform

import { NovaGateway } from './gateway';
import { NovaMessage, NovaTool, NovaToolCall, NovaContext, NovaUsage } from './providers/base';

export interface NovaAgentConfig {
  maxIterations?: number;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
  enableTools?: boolean;
}

export interface NovaAgentExecuteResult {
  id: string;
  content: string;
  toolCalls: NovaToolCall[];
  iterations: number;
  model: string;
  provider: string;
  usage: NovaUsage;
  latencyMs: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
}

export class NovaAgentExecutor {
  private gateway: NovaGateway;

  constructor(gateway: NovaGateway) {
    this.gateway = gateway;
  }

  async execute(
    messages: NovaMessage[],
    tools: NovaTool[],
    context: NovaContext,
    config: NovaAgentConfig = {},
    toolExecutor?: (toolCall: NovaToolCall) => Promise<string>
  ): Promise<NovaAgentExecuteResult> {
    const startTime = Date.now();
    const maxIterations = config.maxIterations ?? 5;
    const timeoutMs = config.timeoutMs ?? 120_000;
    
    let currentMessages = [...messages];
    let iteration = 0;
    let finalContent = '';
    let executedToolCalls: NovaToolCall[] = [];
    let accumulatedUsage: NovaUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };
    let lastModel = 'NOVA';
    let lastProvider = 'nova';

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Agent execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const execution = async () => {
        while (iteration < maxIterations) {
          iteration++;

          const response = await this.gateway.invoke({
            messages: currentMessages,
            tools: config.enableTools !== false && tools.length > 0 ? tools : undefined,
            toolChoice: tools.length > 0 ? 'auto' : undefined,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            context,
          });

          lastModel = response.model;
          lastProvider = response.provider;

          accumulatedUsage.promptTokens += response.usage.promptTokens;
          accumulatedUsage.completionTokens += response.usage.completionTokens;
          accumulatedUsage.totalTokens += response.usage.totalTokens;
          accumulatedUsage.estimatedCost += response.usage.estimatedCost;

          if (response.toolCalls && response.toolCalls.length > 0 && toolExecutor) {
            executedToolCalls.push(...response.toolCalls);

            // Add assistant message with tool calls
            currentMessages.push({
              role: 'assistant',
              content: response.content || '',
              toolCalls: response.toolCalls,
            });

            // Execute each tool concurrently
            const toolResults = await Promise.all(
              response.toolCalls.map(async (tc) => {
                try {
                  const result = await toolExecutor(tc);
                  return { toolCallId: tc.id, result };
                } catch (err) {
                  return {
                    toolCallId: tc.id,
                    result: JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' }),
                  };
                }
              })
            );

            // Add tool results as tool messages
            for (const res of toolResults) {
              currentMessages.push({
                role: 'tool',
                content: res.result,
                toolCallId: res.toolCallId,
              });
            }
          } else {
            // Final response from LLM
            finalContent = response.content;
            break;
          }
        }

        return {
          id: crypto.randomUUID(),
          content: finalContent,
          toolCalls: executedToolCalls,
          iterations: iteration,
          model: lastModel,
          provider: lastProvider,
          usage: accumulatedUsage,
          latencyMs: Date.now() - startTime,
          status: 'success' as const,
        };
      };

      return await Promise.race([execution(), timeoutPromise]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes('timed out');
      return {
        id: crypto.randomUUID(),
        content: finalContent,
        toolCalls: executedToolCalls,
        iterations: iteration,
        model: lastModel,
        provider: lastProvider,
        usage: accumulatedUsage,
        latencyMs: Date.now() - startTime,
        status: isTimeout ? 'timeout' : 'failed',
        error: err instanceof Error ? err.message : 'Execution error',
      };
    }
  }
}
