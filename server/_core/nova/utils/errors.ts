// NOVA Error Handling
// SOPRANOVA Intelligence Platform

export class NovaError extends Error {
  code: string;
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    options: { retryable?: boolean; retryAfter?: number; details?: Record<string, any> } = {}
  ) {
    super(message);
    this.name = 'NovaError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.details = options.details;
  }
}

export class NovaProviderError extends NovaError {
  constructor(provider: string, message: string, retryable: boolean = true) {
    super('NOVA_003', `${provider}: ${message}`, { retryable });
  }
}

export class NovaRateLimitError extends NovaError {
  constructor(retryAfter?: number) {
    super('NOVA_004', 'Rate limited', { retryable: true, retryAfter });
  }
}

export class NovaTimeoutError extends NovaError {
  constructor(timeoutMs: number) {
    super('NOVA_005', `Timeout after ${timeoutMs}ms`, { retryable: true });
  }
}

export class NovaPermissionError extends NovaError {
  constructor(message: string) {
    super('NOVA_007', message, { retryable: false });
  }
}

export class NovaContextTooLongError extends NovaError {
  constructor() {
    super('NOVA_008', 'Context too long', { retryable: false });
  }
}
