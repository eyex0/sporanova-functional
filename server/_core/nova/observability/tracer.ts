// NOVA Tracer
// SOPRANOVA Intelligence Platform

import { NovaUsage } from './providers/base';

export interface TraceRecord {
  id: string;
  workspaceId: string;
  agentId: string;
  model: string;
  provider: string;
  usage: NovaUsage;
  latencyMs: number;
  status: 'success' | 'error';
  error?: string;
}

export class NovaTracer {
  async record(record: TraceRecord): Promise<void> {
    // In production, this would write to the database or observability service
    // For now, we log to console in debug mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[NOVA Trace] ${record.status.toUpperCase()} | Model: ${record.model} | Provider: ${record.provider} | Latency: ${record.latencyMs}ms | Tokens: ${record.usage.totalTokens}`);
    }
  }
}
