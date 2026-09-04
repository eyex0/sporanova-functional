// NOVA Training Observability
// Pure data structure that aggregates per-job observability data (GPU
// utilisation, training loss curve, tokens/sec, cost, etc.) and emits a
// single JSON document that can be uploaded to S3 and reviewed.

import { NovaTrainingJob, TrainingJobMetrics } from '../types';

export interface TrainingObservabilitySnapshot {
  job_id: string;
  timestamp: string;
  status: string;
  runtime_seconds: number;
  loss_curve: Array<{ step: number; train_loss: number; eval_loss?: number; learning_rate: number }>;
  throughput: {
    avg_tokens_per_sec: number;
    avg_samples_per_sec: number;
  };
  gpu: {
    peak_utilization: number;   // 0..1
    avg_utilization: number;
    peak_vram_gb: number;
    avg_vram_gb: number;
  };
  cost: {
    accumulated_usd: number;
    cost_per_1k_tokens: number;
    cost_per_step: number;
  };
  checkpoint: {
    size_bytes: number;
    sha256?: string;
  };
}

export class NovaTrainingObservability {
  /**
   * Build a snapshot from a finished job plus the raw metrics emitted by
   * the training script. The snapshot is what gets persisted to S3 and
   * displayed in the operator dashboard.
   */
  buildSnapshot(job: NovaTrainingJob, raw: {
    loss_curve: Array<{ step: number; train_loss: number; eval_loss?: number; learning_rate: number }>;
    peak_gpu_utilization: number;
    avg_gpu_utilization: number;
    peak_vram_gb: number;
    avg_vram_gb: number;
  }): TrainingObservabilitySnapshot {
    const runtimeSeconds = job.metrics.total_runtime_seconds ?? 0;
    const cost = job.metrics.total_cost_usd ?? 0;
    const tokens = job.metrics.total_tokens ?? 0;
    const steps = job.metrics.total_steps ?? 1;

    return {
      job_id: job.job_id,
      timestamp: new Date().toISOString(),
      status: job.status,
      runtime_seconds: runtimeSeconds,
      loss_curve: raw.loss_curve,
      throughput: {
        avg_tokens_per_sec: runtimeSeconds > 0 ? tokens / runtimeSeconds : 0,
        avg_samples_per_sec: runtimeSeconds > 0 ? steps / runtimeSeconds : 0,
      },
      gpu: {
        peak_utilization: raw.peak_gpu_utilization,
        avg_utilization: raw.avg_gpu_utilization,
        peak_vram_gb: raw.peak_vram_gb,
        avg_vram_gb: raw.avg_vram_gb,
      },
      cost: {
        accumulated_usd: cost,
        cost_per_1k_tokens: tokens > 0 ? (cost / tokens) * 1000 : 0,
        cost_per_step: cost / Math.max(1, steps),
      },
      checkpoint: {
        size_bytes: job.metrics.checkpoint_size_bytes ?? 0,
        sha256: undefined,
      },
    };
  }

  /**
   * Approximate cost projection for a planned (not yet started) job.
   * Used by the operator UI before submission.
   */
  projectCost(gpu: NovaTrainingJob['gpu'], estimatedRuntimeHours: number): number {
    return (gpu.estimated_cost_per_hour * gpu.gpu_count) * estimatedRuntimeHours;
  }
}
