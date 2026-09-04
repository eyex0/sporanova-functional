# Training Operations

## Job Lifecycle

```
QUEUED → RUNNING → COMPLETED → EVALUATING → APPROVED / REJECTED
  ↓         ↓          ↓
CANCELLED  ERROR    CANCELLED
```

## Creating a Job

```typescript
import { NovaTrainingOrchestrator } from '../cloud/jobs/orchestrator';
const orch = new NovaTrainingOrchestrator();
const job = orch.createJob({
  model_name: 'nova',
  model_version: 'v0.6',
  base_model: 'Qwen/Qwen2.5-72B-Instruct',
  training_method: 'qlora',
  dataset_version: 'v0.5.1',
  dataset_hash: 'sha256:abc...',
  config_path: 'training/configs/nova-qlora.yaml',
  config_hash: 'sha256:def...',
  gpu: { provider: 'runpod', gpu_type: 'a100-80gb', gpu_count: 1, ... },
  hyperparameters: { learning_rate: 2e-4, batch_size: 4, ... },
  seed: 42,
});
```

## Budget Enforcement

The orchestrator rejects jobs that exceed:
- `max_gpu_hours` (default: no limit)
- `max_cost_usd` (default: no limit)
- `max_concurrent_jobs` (default: 2)

## Operator Runbook

The `launch_training_job.ts` script:
1. Creates a training job record
2. Validates against the configured budget
3. Prints the full runbook (dataset, config, GPU spec)
4. **NEVER starts a GPU** — the operator must do this manually

```bash
npx tsx training/scripts/launch_training_job.ts \
  --dataset-version v0.5.1 \
  --dataset-hash sha256:abc \
  --config-hash sha256:def \
  --gpu-provider runpod \
  --gpu-type a100-80gb \
  --seed 20260904
```

## Completing a Job

```typescript
orch.complete(job.job_id, {
  total_runtime_seconds: 4 * 3600,
  final_train_loss: 0.45,
  final_eval_loss: 0.52,
  best_eval_loss: 0.5,
  total_tokens: 1_000_000_000,
  total_steps: 1000,
  peak_gpu_utilization: 0.95,
  avg_tokens_per_sec: 70_000,
  total_cost_usd: 8,
  checkpoint_size_bytes: 256_000_000,
});
```

## Storage Layout

All artifacts follow the canonical S3 layout:

```
s3://sopranova-training/nova/
├── datasets/nova-v0.5.1/
├── checkpoints/nova-qlora-v0.5.1/
├── evaluations/nova-v0.5.1/eval-001/
├── artifacts/nova-v0.5.1/
├── logs/nova-job-123/
└── registry/models.json
```
