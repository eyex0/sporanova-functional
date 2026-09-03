// NOVA Retry Logic
// SOPRANOVA Intelligence Platform

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  isRetryable: (err: unknown) => boolean = () => true
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === cfg.maxRetries || !isRetryable(err)) {
        throw err;
      }
      const delay = Math.min(
        cfg.baseDelayMs * Math.pow(cfg.backoffFactor, attempt),
        cfg.maxDelayMs
      );
      // Equal jitter: delay/2 + random * delay/2
      const jitter = delay / 2 + Math.random() * (delay / 2);
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }

  throw lastError;
}
