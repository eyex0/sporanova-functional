// NOVA Training Job Orchestrator
// Defines the canonical job lifecycle, gates, and budget enforcement.
// The orchestrator does NOT execute GPU jobs. It produces a fully-described
// training job record, validates the requested configuration against
// budgets and safety rules, and exposes a deterministic lifecycle for the
// external training script + the human reviewer to advance the state.

import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  NovaTrainingJob,
  TrainingJobStatus,
  TrainingMethod,
  GPUConfig,
  TrainingHyperparameters,
  TrainingJobMetrics,
  TrainingBudget,
  CheckpointProvenance,
} from '../types';
import { NovaObjectStorageLayout } from '../storage/layout';
import { NovaGPUProviderRegistry, MockGPUProvider, estimateJobCost, GPUProvider } from '../providers/gpu_provider';

const VALID_TRANSITIONS: Record<TrainingJobStatus, TrainingJobStatus[]> = {
  QUEUED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: ['EVALUATING'],
  EVALUATING: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
};

export interface CreateTrainingJobInput {
  model_name: string;
  model_version: string;
  base_model: string;
  training_method: TrainingMethod;
  dataset_version: string;
  dataset_hash: string;
  config_path: string;
  config_hash: string;
  gpu: GPUConfig;
  hyperparameters: TrainingHyperparameters;
  seed: number;
  git_commit?: string;
}

export class NovaTrainingOrchestrator {
  private jobs = new Map<string, NovaTrainingJob>();
  private budget: TrainingBudget;
  private storage: NovaObjectStorageLayout;
  private registry: NovaGPUProviderRegistry;
  private concurrentCount = 0;

  constructor(opts: {
    budget?: Partial<TrainingBudget>;
    storage?: NovaObjectStorageLayout;
    registry?: NovaGPUProviderRegistry;
  } = {}) {
    this.budget = {
      max_gpu_hours: 200,
      max_cost_usd: 5000,
      max_retries: 2,
      max_concurrent_jobs: 1,
      cost_alert_threshold_pct: 0.8,
      ...opts.budget,
    };
    this.storage = opts.storage || new NovaObjectStorageLayout();
    this.registry = opts.registry || buildDefaultRegistry();
  }

  // ── Job creation ──────────────────────────────────────────────────

  createJob(input: CreateTrainingJobInput): NovaTrainingJob {
    this.assertSafeConfig(input);
    const jobId = this.generateJobId(input);
    const now = new Date().toISOString();

    const job: NovaTrainingJob = {
      job_id: jobId,
      model_name: input.model_name,
      model_version: input.model_version,
      base_model: input.base_model,
      training_method: input.training_method,
      dataset_version: input.dataset_version,
      dataset_hash: input.dataset_hash,
      config_path: input.config_path,
      config_hash: input.config_hash,
      gpu: input.gpu,
      hyperparameters: input.hyperparameters,
      seed: input.seed,
      git_commit: input.git_commit,
      status: 'QUEUED',
      checkpoint_location: this.storage.checkpointPath(input.model_version, input.training_method),
      logs_location: this.storage.logsPath(jobId),
      artifact_locations: {
        output: this.storage.artifactPath(jobId),
        manifest: this.storage.manifestPath(jobId),
      },
      metrics: {},
    };

    this.jobs.set(jobId, job);
    return job;
  }

  // ── Job lifecycle ─────────────────────────────────────────────────

  start(jobId: string): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'RUNNING');
    this.assertBudgetForNewRun();
    job.status = 'RUNNING';
    job.started_at = new Date().toISOString();
    this.concurrentCount += 1;
    return job;
  }

  complete(jobId: string, metrics: TrainingJobMetrics): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'COMPLETED');
    this.assertBudgetForCompletion(job, metrics);
    job.status = 'COMPLETED';
    job.completed_at = new Date().toISOString();
    job.metrics = { ...job.metrics, ...metrics };
    this.concurrentCount -= 1;
    return job;
  }

  fail(jobId: string, reason: string): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'FAILED');
    job.status = 'FAILED';
    job.completed_at = new Date().toISOString();
    job.failure_reason = reason;
    this.concurrentCount -= 1;
    return job;
  }

  cancel(jobId: string, reason: string): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'CANCELLED');
    job.status = 'CANCELLED';
    job.completed_at = new Date().toISOString();
    job.failure_reason = reason;
    this.concurrentCount -= 1;
    return job;
  }

  beginEvaluation(jobId: string): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'EVALUATING');
    job.status = 'EVALUATING';
    job.evaluation_location = this.storage.evaluationPath(job.model_version, `eval-${jobId}`);
    return job;
  }

  approve(jobId: string, approverId: string, notes?: string): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'APPROVED');
    job.status = 'APPROVED';
    job.approval_status = 'APPROVED';
    job.approved_by = approverId;
    job.approved_at = new Date().toISOString();
    if (notes) job.notes = notes;
    return job;
  }

  reject(jobId: string, approverId: string, notes: string): NovaTrainingJob {
    const job = this.getRequired(jobId);
    this.assertTransition(job.status, 'REJECTED');
    job.status = 'REJECTED';
    job.approval_status = 'REJECTED';
    job.approved_by = approverId;
    job.approved_at = new Date().toISOString();
    job.notes = notes;
    return job;
  }

  // ── Query ─────────────────────────────────────────────────────────

  get(jobId: string): NovaTrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  list(status?: TrainingJobStatus): NovaTrainingJob[] {
    const all = Array.from(this.jobs.values());
    return status ? all.filter(j => j.status === status) : all;
  }

  describeBudget(): TrainingBudget {
    return { ...this.budget };
  }

  describeStorage(): NovaObjectStorageLayout {
    return this.storage;
  }

  // ── Persistence (handy for CLI / serverless orchestrators) ────────

  save(filePath: string): void {
    const data = Array.from(this.jobs.values());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  load(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as NovaTrainingJob[];
    this.jobs = new Map(data.map(j => [j.job_id, j]));
  }

  // ── Internal validation ───────────────────────────────────────────

  private getRequired(jobId: string): NovaTrainingJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    return job;
  }

  private assertTransition(from: TrainingJobStatus, to: TrainingJobStatus): void {
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw new Error(`Invalid transition: ${from} -> ${to}. Allowed: ${VALID_TRANSITIONS[from].join(', ')}`);
    }
  }

  private assertSafeConfig(input: CreateTrainingJobInput): void {
    if (!input.base_model || !input.dataset_hash) {
      throw new Error('base_model and dataset_hash are required');
    }
    if (input.gpu.max_runtime_hours > this.budget.max_gpu_hours) {
      throw new Error(
        `Requested GPU runtime (${input.gpu.max_runtime_hours}h) exceeds budget (${this.budget.max_gpu_hours}h)`,
      );
    }
    if (input.hyperparameters.epochs < 1) {
      throw new Error('epochs must be >= 1');
    }
    if (input.hyperparameters.learning_rate <= 0) {
      throw new Error('learning_rate must be > 0');
    }
  }

  private assertBudgetForNewRun(): void {
    if (this.concurrentCount >= this.budget.max_concurrent_jobs) {
      throw new Error(
        `Max concurrent training jobs reached: ${this.concurrentCount}/${this.budget.max_concurrent_jobs}`,
      );
    }
  }

  private assertBudgetForCompletion(job: NovaTrainingJob, metrics: TrainingJobMetrics): void {
    if (metrics.total_runtime_seconds) {
      const hours = metrics.total_runtime_seconds / 3600;
      if (hours > job.gpu.max_runtime_hours) {
        throw new Error(
          `Job ${job.job_id} exceeded max runtime: ${hours.toFixed(2)}h > ${job.gpu.max_runtime_hours}h`,
        );
      }
    }
    if (metrics.total_cost_usd && metrics.total_cost_usd > this.budget.max_cost_usd) {
      throw new Error(
        `Job ${job.job_id} exceeded max cost: $${metrics.total_cost_usd} > $${this.budget.max_cost_usd}`,
      );
    }
  }

  private generateJobId(input: CreateTrainingJobInput): string {
    const hash = crypto.createHash('sha256')
      .update(`${input.model_name}-${input.model_version}-${input.dataset_hash}-${input.config_hash}-${Date.now()}`)
      .digest('hex').slice(0, 12);
    return `nova-job-${input.training_method}-${input.model_version}-${hash}`;
  }
}

function buildDefaultRegistry(): NovaGPUProviderRegistry {
  return new NovaGPUProviderRegistry()
    .register(new MockGPUProvider('aws'))
    .register(new MockGPUProvider('runpod'))
    .register(new MockGPUProvider('lambda'))
    .register(new MockGPUProvider('modal'))
    .register(new MockGPUProvider('vast'))
    .register(new MockGPUProvider('gcp'))
    .register(new MockGPUProvider('azure'))
    .register(new MockGPUProvider('local'))
    .register(new MockGPUProvider('generic'));
}

// ── Checkpoint provenance builder ──────────────────────────────────────

export interface BuildCheckpointProvenanceInput {
  checkpoint_provenance_id: string;
  job: NovaTrainingJob;
  checkpoint_size_bytes: number;
  adapter_sha256?: string;
  tokenizer_sha256?: string;
  full_checkpoint_sha256?: string;
}

export function buildCheckpointProvenance(input: BuildCheckpointProvenanceInput): CheckpointProvenance {
  const { job } = input;
  if (!job.completed_at) {
    throw new Error('Cannot build checkpoint provenance for a non-completed job');
  }
  return {
    checkpoint_id: input.checkpoint_provenance_id,
    base_model: job.base_model,
    training_job_id: job.job_id,
    training_method: job.training_method,
    dataset_version: job.dataset_version,
    dataset_hash: job.dataset_hash,
    config_hash: job.config_hash,
    seed: job.seed,
    adapter_sha256: input.adapter_sha256,
    tokenizer_sha256: input.tokenizer_sha256,
    full_checkpoint_sha256: input.full_checkpoint_sha256,
    size_bytes: input.checkpoint_size_bytes,
    created_at: job.completed_at,
    storage_location: job.checkpoint_location,
    git_commit: job.git_commit,
    reproducibility: {
      deterministic: true,
      seed_fixed: true,
      bf16: !!job.hyperparameters.bf16,
      gradient_checkpointing: !!job.hyperparameters.gradient_checkpointing,
    },
  };
}
