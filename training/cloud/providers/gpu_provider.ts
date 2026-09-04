// NOVA Cloud GPU Provider Abstraction
// Defines a uniform interface for the external GPU providers that NOVA can
// be trained on. The actual provider SDKs are NOT imported here; this file
// defines contracts, configuration, and a `MockGPUProvider` that is safe to
// run in CI without any cloud credentials.
//
// Provider implementations live in ./aws.ts, ./runpod.ts, ./modal.ts, etc.
// They are intentionally empty stubs that document the SDK calls and the
// secrets that must be supplied via environment variables. They are NEVER
// invoked from the running app.

import crypto from 'crypto';
import { GPUProvider, GPUConfig, NovaTrainingJob } from '../../types';

export interface JobSubmissionRequest {
  job: NovaTrainingJob;
  image_uri: string;             // e.g. docker image that runs training/qlora/train.py
  command: string[];             // e.g. ['python','-m','training.qlora.train','--config', ...]
  environment: Record<string, string>; // non-secret env vars
  secret_names: string[];        // names of secrets pulled from the secret manager
  storage: {
    dataset_uri: string;
    output_uri: string;
    checkpoint_uri: string;
    logs_uri: string;
  };
}

export interface JobStatusSnapshot {
  job_id: string;
  provider: GPUProvider;
  provider_job_id?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
  started_at?: string;
  completed_at?: string;
  runtime_seconds?: number;
  message?: string;
  metrics?: Record<string, number>;
}

export interface ProvisionResult {
  provider: GPUProvider;
  instance_id: string;
  gpu: GPUConfig;
  cost_per_hour: number;
  region: string;
}

export interface NovaGPUProvider {
  readonly provider: GPUProvider;
  /** Estimate the cost for a job that targets `gpu` for `runtimeHours` hours. */
  estimateCost(gpu: GPUConfig, runtimeHours: number): number;
  /** Submit a training job. The implementation should be idempotent. */
  submitJob(req: JobSubmissionRequest): Promise<{ provider_job_id: string }>;
  /** Poll the provider for current status. */
  getJobStatus(providerJobId: string): Promise<JobStatusSnapshot>;
  /** Fetch the latest log tail. */
  getLogs(providerJobId: string, tailLines: number): Promise<string>;
  /** Cancel a running job. Idempotent. */
  cancelJob(providerJobId: string): Promise<void>;
  /** Download the produced checkpoint to a local path. */
  downloadCheckpoint(providerJobId: string, localPath: string): Promise<string>;
  /** Release any resources (e.g. spot-instance request). */
  release(providerJobId: string): Promise<void>;
}

// ── Cost catalog (approximate list prices, USD/hour) ────────────────────

export const GPU_COST_CATALOG: Record<GPUProvider, Record<string, { per_gpu_hour: number; vram_gb: number }>> = {
  aws: {
    'a100-80gb': { per_gpu_hour: 4.10, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 12.40, vram_gb: 80 },
    'h100-80gb-sxm': { per_gpu_hour: 12.40, vram_gb: 80 },
    'l40s-48gb': { per_gpu_hour: 1.80, vram_gb: 48 },
    'rtx-a6000-48gb': { per_gpu_hour: 1.20, vram_gb: 48 },
  },
  runpod: {
    'a100-80gb': { per_gpu_hour: 1.99, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 4.99, vram_gb: 80 },
    'l40s-48gb': { per_gpu_hour: 0.99, vram_gb: 48 },
  },
  lambda: {
    'a100-80gb': { per_gpu_hour: 1.79, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 4.99, vram_gb: 80 },
    'a10-24gb': { per_gpu_hour: 0.75, vram_gb: 24 },
  },
  modal: {
    'a100-80gb': { per_gpu_hour: 2.50, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 5.50, vram_gb: 80 },
  },
  vast: {
    'a100-80gb': { per_gpu_hour: 1.49, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 3.99, vram_gb: 80 },
  },
  gcp: {
    'a100-80gb': { per_gpu_hour: 4.95, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 11.65, vram_gb: 80 },
  },
  azure: {
    'a100-80gb': { per_gpu_hour: 4.85, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 12.85, vram_gb: 80 },
  },
  local: {
    'a100-80gb': { per_gpu_hour: 0.00, vram_gb: 80 },
  },
  generic: {
    'a100-80gb': { per_gpu_hour: 2.00, vram_gb: 80 },
    'h100-80gb': { per_gpu_hour: 5.00, vram_gb: 80 },
  },
};

export function estimateJobCost(gpu: GPUConfig, runtimeHours: number): number {
  const providerCatalog = GPU_COST_CATALOG[gpu.provider] || GPU_COST_CATALOG.generic;
  const sku = providerCatalog[gpu.gpu_type] || { per_gpu_hour: gpu.estimated_cost_per_hour || 2.0, vram_gb: gpu.vram_gb || 80 };
  const perHour = sku.per_gpu_hour * gpu.gpu_count;
  return Number((perHour * runtimeHours).toFixed(2));
}

// ── Mock provider used by tests and CI ──────────────────────────────────

export class MockGPUProvider implements NovaGPUProvider {
  readonly provider: GPUProvider;
  private jobs = new Map<string, JobStatusSnapshot>();
  private logs = new Map<string, string[]>();

  constructor(provider: GPUProvider = 'generic') {
    this.provider = provider;
  }

  estimateCost(gpu: GPUConfig, runtimeHours: number): number {
    return estimateJobCost(gpu, runtimeHours);
  }

  async submitJob(req: JobSubmissionRequest): Promise<{ provider_job_id: string }> {
    const providerJobId = `mock-${this.provider}-${crypto.randomBytes(4).toString('hex')}`;
    this.jobs.set(providerJobId, {
      job_id: req.job.job_id,
      provider: this.provider,
      provider_job_id: providerJobId,
      status: 'QUEUED',
      started_at: new Date().toISOString(),
    });
    this.logs.set(providerJobId, [
      `[${new Date().toISOString()}] mock provider received job ${req.job.job_id}`,
      `[${new Date().toISOString()}] command: ${req.command.join(' ')}`,
      `[${new Date().toISOString()}] dataset: ${req.storage.dataset_uri}`,
    ]);
    return { provider_job_id: providerJobId };
  }

  async getJobStatus(providerJobId: string): Promise<JobStatusSnapshot> {
    const snap = this.jobs.get(providerJobId);
    if (!snap) {
      return { job_id: 'unknown', provider: this.provider, status: 'UNKNOWN', message: 'no such job' };
    }
    return snap;
  }

  async getLogs(providerJobId: string, tailLines: number): Promise<string> {
    const lines = this.logs.get(providerJobId) || [];
    return lines.slice(-Math.max(1, tailLines)).join('\n');
  }

  async cancelJob(providerJobId: string): Promise<void> {
    const snap = this.jobs.get(providerJobId);
    if (snap) {
      snap.status = 'CANCELLED';
      snap.completed_at = new Date().toISOString();
    }
  }

  async downloadCheckpoint(providerJobId: string, localPath: string): Promise<string> {
    return `${localPath}/${providerJobId}.safetensors`;
  }

  async release(providerJobId: string): Promise<void> {
    this.jobs.delete(providerJobId);
    this.logs.delete(providerJobId);
  }

  // Test-only helpers
  _setStatus(providerJobId: string, status: JobStatusSnapshot['status']): void {
    const snap = this.jobs.get(providerJobId);
    if (snap) {
      snap.status = status;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        snap.completed_at = new Date().toISOString();
      }
    }
  }

  _appendLog(providerJobId: string, line: string): void {
    const arr = this.logs.get(providerJobId) || [];
    arr.push(`[${new Date().toISOString()}] ${line}`);
    this.logs.set(providerJobId, arr);
  }
}

// ── Provider registry / factory ────────────────────────────────────────

const PROVIDER_ENV_VAR: Record<GPUProvider, string> = {
  aws: 'SOPRANOVA_AWS_PROVIDER_ENABLED',
  runpod: 'SOPRANOVA_RUNPOD_PROVIDER_ENABLED',
  lambda: 'SOPRANOVA_LAMBDA_PROVIDER_ENABLED',
  modal: 'SOPRANOVA_MODAL_PROVIDER_ENABLED',
  vast: 'SOPRANOVA_VAST_PROVIDER_ENABLED',
  gcp: 'SOPRANOVA_GCP_PROVIDER_ENABLED',
  azure: 'SOPRANOVA_AZURE_PROVIDER_ENABLED',
  local: 'SOPRANOVA_LOCAL_PROVIDER_ENABLED',
  generic: 'SOPRANOVA_GENERIC_PROVIDER_ENABLED',
};

export class NovaGPUProviderRegistry {
  private providers = new Map<GPUProvider, NovaGPUProvider>();

  register(p: NovaGPUProvider): this {
    this.providers.set(p.provider, p);
    return this;
  }

  get(provider: GPUProvider): NovaGPUProvider {
    const p = this.providers.get(provider);
    if (!p) {
      throw new Error(
        `GPU provider '${provider}' is not registered. ` +
        `To enable it, set env var ${PROVIDER_ENV_VAR[provider]}=1 and provide the corresponding credentials. ` +
        `For tests and CI, use the MockGPUProvider.`,
      );
    }
    return p;
  }

  list(): GPUProvider[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Build a registry that contains the MockGPUProvider for every known
 * provider. This is what the application code uses today; the real provider
 * adapters are stubbed and live in separate files (./aws.ts, ./runpod.ts, …)
 * that are imported only when the corresponding environment variable is set.
 */
export function buildDefaultProviderRegistry(): NovaGPUProviderRegistry {
  const reg = new NovaGPUProviderRegistry();
  for (const provider of Object.keys(GPU_COST_CATALOG) as GPUProvider[]) {
    reg.register(new MockGPUProvider(provider));
  }
  return reg;
}
