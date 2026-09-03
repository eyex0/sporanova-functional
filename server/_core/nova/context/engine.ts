// NOVA Context Engine
// SOPRANOVA Intelligence Platform

import { NovaMessage } from './providers/base';

export interface ContextConfig {
  maxContextWindow: number;
  maxHistoryMessages: number;
  compactionThreshold: number;
}

export class NovaContextEngine {
  private config: ContextConfig;

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = {
      maxContextWindow: config.maxContextWindow ?? 128000,
      maxHistoryMessages: config.maxHistoryMessages ?? 20,
      compactionThreshold: config.compactionThreshold ?? 0.8,
    };
  }

  async build(messages: NovaMessage[]): Promise<NovaMessage[]> {
    // Keep system message + recent history
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const recentMessages = conversationMessages.slice(-this.config.maxHistoryMessages);

    return [...systemMessages, ...recentMessages];
  }

  needsCompaction(messages: NovaMessage[]): boolean {
    const estimatedTokens = this.estimateTokens(messages);
    return estimatedTokens > this.config.maxContextWindow * this.config.compactionThreshold;
  }

  async compact(messages: NovaMessage[]): Promise<NovaMessage[]> {
    // Micro-compaction: keep first system message, last N messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');
    const keepCount = Math.floor(this.config.maxHistoryMessages / 2);
    const recent = nonSystem.slice(-keepCount);

    return [...systemMessages, ...recent];
  }

  private estimateTokens(messages: NovaMessage[]): number {
    // Rough estimate: 1 token per 4 characters
    let totalChars = 0;
    for (const msg of messages) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      totalChars += content.length;
    }
    return Math.ceil(totalChars / 4);
  }
}
