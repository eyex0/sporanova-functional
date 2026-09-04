import { describe, it, expect } from 'vitest';
import { NovaTrainingOrchestrator, buildCheckpointProvenance } from '../training/cloud/jobs/orchestrator';
import { NovaTrainingJob, CreateTrainingJobInput } from '../training/cloud/jobs/orchestrator';

const baseInput: CreateTrainingJobInput = {
  model_name: 'nova',
  model_version: 'v0.5.1',
  base_model: 'Qwen/Qwen2.5-72B-Instruct',
  training_method: 'qlora',
  dataset_version: 'v0.5.1',
  dataset_hash: 'sha256:abc',
  config_path: 'training/configs/nova-qlora.yaml',
  config_hash: 'sha256:def',
  gpu: {
    provider: 'runpod',
    gpu_type: 'a100-80gb',
    gpu_count: 1,
    vram_gb: 80,
    estimated_cost_per_hour: 1.99,
    max_runtime_hours: 24,
  },
  hyperparameters: {
    learning_rate: 2e-4,
    batch_size: 4,
    gradient_accumulation: 8,
    effective_batch_size: 32,
    epochs: 1,
    warmup_steps: 50,
    max_seq_length: 4096,
    gradient_checkpointing: true,
    bf16: true,
    fp16: false,
    seed: 42,
    weight_decay: 0.01,
    max_grad_norm: 1.0,
    lr_scheduler_type: 'cosine',
    optim: 'paged_adamw_8bit',
    logging_steps: 10,
    save_steps: 200,
    eval_steps: 200,
    save_total_limit: 3,
    lora_r: 64,
    lora_alpha: 128,
    lora_dropout: 0.05,
  },
  seed: 42,
};

describe('NovaTrainingOrchestrator', () => {
  it('creates a job in QUEUED state', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    expect(job.status).toBe('QUEUED');
    expect(job.job_id).toMatch(/^nova-job-qlora-v0\.5\.1-/);
    expect(job.gpu.gpu_type).toBe('a100-80gb');
  });

  it('refuses a job that exceeds the budget', () => {
    const o = new NovaTrainingOrchestrator({ budget: { max_gpu_hours: 8 } });
    expect(() => o.createJob({
      ...baseInput,
      gpu: { ...baseInput.gpu, max_runtime_hours: 24 },
    })).toThrow(/exceeds budget/);
  });

  it('walks through the full lifecycle QUEUED -> RUNNING -> COMPLETED -> EVALUATING -> APPROVED', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    o.start(job.job_id);
    expect(o.get(job.job_id)!.status).toBe('RUNNING');

    o.complete(job.job_id, {
      total_runtime_seconds: 4 * 3600,
      final_train_loss: 0.45,
      final_eval_loss: 0.52,
      best_eval_loss: 0.5,
      total_tokens: 1_000_000_000,
      total_steps: 1000,
      peak_gpu_utilization: 0.95,
      avg_tokens_per_sec: 70_000,
      avg_samples_per_sec: 3,
      total_cost_usd: 8,
      checkpoint_size_bytes: 256_000_000,
    });
    expect(o.get(job.job_id)!.status).toBe('COMPLETED');

    o.beginEvaluation(job.job_id);
    expect(o.get(job.job_id)!.status).toBe('EVALUATING');

    o.approve(job.job_id, 'reviewer-1', 'looks good');
    expect(o.get(job.job_id)!.status).toBe('APPROVED');
  });

  it('rejects invalid transitions', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    expect(() => o.complete(job.job_id, { total_runtime_seconds: 0 })).toThrow(/Invalid transition/);
  });

  it('rejects a completed job whose runtime exceeds the budget', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    o.start(job.job_id);
    expect(() => o.complete(job.job_id, {
      total_runtime_seconds: 100 * 3600,
      total_cost_usd: 10,
    })).toThrow(/exceeded max runtime/);
  });

  it('rejects a completed job whose cost exceeds the budget', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    o.start(job.job_id);
    expect(() => o.complete(job.job_id, {
      total_runtime_seconds: 100,
      total_cost_usd: 99_999,
    })).toThrow(/exceeded max cost/);
  });

  it('limits concurrent jobs', () => {
    const o = new NovaTrainingOrchestrator({ budget: { max_concurrent_jobs: 1 } });
    const j1 = o.createJob(baseInput);
    const j2 = o.createJob({ ...baseInput, model_version: 'v0.6' });
    o.start(j1.job_id);
    expect(() => o.start(j2.job_id)).toThrow(/Max concurrent/);
  });

  it('can be cancelled and moved back through the lifecycle', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    o.start(job.job_id);
    o.cancel(job.job_id, 'operator requested abort');
    expect(o.get(job.job_id)!.status).toBe('CANCELLED');
  });

  it('builds a checkpoint provenance record from a completed job', () => {
    const o = new NovaTrainingOrchestrator();
    const job = o.createJob(baseInput);
    o.start(job.job_id);
    o.complete(job.job_id, { total_runtime_seconds: 100, total_cost_usd: 1 });
    const cp = buildCheckpointProvenance({
      checkpoint_provenance_id: 'cp-1',
      job: o.get(job.job_id)!,
      checkpoint_size_bytes: 1024,
      adapter_sha256: 'sha256:adapter',
    });
    expect(cp.training_job_id).toBe(job.job_id);
    expect(cp.base_model).toBe('Qwen/Qwen2.5-72B-Instruct');
    expect(cp.reproducibility.seed_fixed).toBe(true);
    expect(cp.reproducibility.bf16).toBe(true);
    expect(cp.size_bytes).toBe(1024);
  });
});
