// NOVA Tool Scheduler
// SOPRANOVA Intelligence Platform

import { NovaToolCall } from './providers/base';

export type ToolExecutor = (toolCall: NovaToolCall) => Promise<string>;

export interface ToolExecutionResult {
  toolCallId: string;
  result: string;
  status: 'success' | 'error';
  error?: string;
  latencyMs: number;
}

export class NovaToolScheduler {
  async schedule(
    toolCalls: NovaToolCall[],
    executor: ToolExecutor
  ): Promise<ToolExecutionResult[]> {
    const results = await Promise.all(
      toolCalls.map(async (tc) => {
        const startTime = Date.now();
        try {
          const result = await executor(tc);
          return {
            toolCallId: tc.id,
            result,
            status: 'success' as const,
            latencyMs: Date.now() - startTime,
          };
        } catch (err) {
          return {
            toolCallId: tc.id,
            result: JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' }),
            status: 'error' as const,
            error: err instanceof Error ? err.message : 'Unknown error',
            latencyMs: Date.now() - startTime,
          };
        }
      })
    );
    return results;
  }
}
