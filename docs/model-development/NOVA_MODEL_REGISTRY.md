# NOVA Model Registry

## Overview

The model registry tracks every trained model through its lifecycle from training to production. All promotions are manual — no model reaches production without explicit approval.

## Model Lifecycle

```
TRAINING → EVALUATION → CANDIDATE → APPROVED → PRODUCTION → DEPRECATED
```

| Stage | Description | Trigger |
|-------|-------------|---------|
| TRAINING | Model is being trained | Training starts |
| EVALUATION | Model is being evaluated | Training completes |
| CANDIDATE | Model passed evaluation, awaiting review | Evaluation passes |
| APPROVED | Model approved for production deployment | Manual approval |
| PRODUCTION | Model is live in production | Manual deployment |
| DEPRECATED | Model is retired from production | Manual deprecation |

## Registry File Format

The registry is stored as JSON at `registry/registry.json`:

```json
{
  "models": [
    {
      "id": "nova-7b-qlora-v0.3-20260315",
      "name": "nova-7b-qlora-v0.3",
      "version": "0.3.1",
      "stage": "production",
      "created": "2026-03-15T10:30:00Z",
      "updated": "2026-03-18T14:00:00Z",
      "method": "qlora",
      "base_model": "Qwen/Qwen2.5-7B",
      "dataset_version": "v0.3",
      "training": {
        "config": "training/configs/nova-qlora.yaml",
        "checkpoint": "training/checkpoints/nova-7b-qlora-v0.3/best/",
        "duration_hours": 8.2,
        "gpu": "A100-80GB",
        "epochs": 3,
        "final_loss": 0.82
      },
      "evaluation": {
        "results_dir": "results/nova-7b-qlora-v0.3/",
        "mean_score": 58.3,
        "category_scores": {
          "math": 61.2,
          "code": 52.0,
          "reasoning": 67.5,
          "safety": 85.3
        },
        "regressions": [],
        "pass": true
      },
      "approval": {
        "approved_by": "montaser@example.com",
        "approved_at": "2026-03-18T14:00:00Z",
        "notes": "Passed all benchmarks, no regressions"
      },
      "deployment": {
        "deployed_at": "2026-03-19T09:00:00Z",
        "endpoint": "https://api.example.com/v1/chat",
        "replicas": 2
      },
      "artifacts": {
        "merged_model": "models/nova-7b-qlora-v0.3-merged/",
        "adapter": "training/checkpoints/nova-7b-qlora-v0.3/best/",
        "tokenizer": "models/nova-7b-qlora-v0.3-merged/tokenizer.json"
      },
      "metrics": {
        "inference_latency_p50_ms": 45,
        "inference_latency_p99_ms": 120,
        "throughput_rps": 15.2,
        "error_rate": 0.001
      },
      "tags": ["7b", "qlora", "multilingual", "production"]
    }
  ],
  "metadata": {
    "registry_version": "1.0.0",
    "last_updated": "2026-03-19T09:00:00Z",
    "total_models": 12,
    "active_models": 2
  }
}
```

## Registering Models

### Automatic registration (after training)

```bash
python registry/register.py \
  --model training/checkpoints/nova-7b-qlora-v0.3/best/ \
  --results results/nova-7b-qlora-v0.3/ \
  --name nova-7b-qlora-v0.3 \
  --method qlora \
  --dataset v0.3 \
  --base-model Qwen/Qwen2.5-7B
```

### Manual registration

```bash
python registry/register.py \
  --model models/nova-7b-custom/ \
  --name nova-7b-custom \
  --method fullft \
  --dataset v0.3 \
  --base-model Qwen/Qwen2.5-7B \
  --skip-evaluation  # if you have external results
```

### Registration output

```
Registered model: nova-7b-qlora-v0.3-20260315
Stage: EVALUATION
Run evaluation: python registry/promote.py --model nova-7b-qlora-v0.3-20260315 --stage CANDIDATE
```

## Promoting Models

All promotions are manual and require explicit approval:

```bash
# Promote to CANDIDATE (evaluation passed)
python registry/promote.py \
  --model nova-7b-qlora-v0.3-20260315 \
  --stage CANDIDATE \
  --reason "All benchmarks pass, mean score 58.3"

# Promote to APPROVED (human review complete)
python registry/promote.py \
  --model nova-7b-qlora-v0.3-20260315 \
  --stage APPROVED \
  --approved-by montaser@example.com \
  --reason "Reviewed evaluation results, approved for production"

# Deploy to PRODUCTION
python registry/promote.py \
  --model nova-7b-qlora-v0.3-20260315 \
  --stage PRODUCTION \
  --endpoint https://api.example.com/v1/chat \
  --replicas 2
```

### Promotion rules

| From | To | Requirements |
|------|----|--------------|
| EVALUATION | CANDIDATE | Evaluation pass=true, no regressions |
| CANDIDATE | APPROVED | Manual approval with approver name |
| APPROVED | PRODUCTION | Deployment config provided |
| PRODUCTION | DEPRECATED | Manual deprecation with reason |

### Blocking conditions

A model cannot be promoted if:

1. Evaluation has `pass: false`
2. Any safety benchmark < 70
3. Regressions detected against previous production model
4. Missing required fields (evaluation results, approval)

## Deprecating Models

```bash
python registry/deprecate.py \
  --model nova-7b-qlora-v0.2-20260201 \
  --reason "Superseded by v0.3 with improved multilingual support" \
  --replaced-by nova-7b-qlora-v0.3-20260315
```

Deprecated models:

- Are removed from production routing
- Retained in registry for audit trail
- Can be reactivated if needed

## Querying the Registry

```bash
# List all models
python registry/list.py

# List production models
python registry/list.py --stage production

# Show model details
python registry/show.py nova-7b-qlora-v0.3-20260315

# Compare two models
python registry/compare.py \
  --model-a nova-7b-qlora-v0.2-20260201 \
  --model-b nova-7b-qlora-v0.3-20260315

# Search by tag
python registry/search.py --tag multilingual

# Export registry as CSV
python registry/export.py --format csv --output registry_export.csv
```

## Registry Directory Structure

```
registry/
├── registry.json              # Main registry file
├── archive/                   # Historical snapshots
│   ├── registry-2026-03-15.json
│   └── registry-2026-03-01.json
├── models/                    # Per-model metadata
│   ├── nova-7b-qlora-v0.3-20260315/
│   │   ├── metadata.json
│   │   ├── evaluation.json
│   │   └── deployment.json
│   └── nova-7b-lora-v0.3-20260320/
└── scripts/
    ├── register.py
    ├── promote.py
    ├── deprecate.py
    ├── list.py
    └── compare.py
```

## Version Naming Convention

```
<model-name>-<method>-<dataset-version>-<date>
```

Examples:

- `nova-7b-qlora-v0.3-20260315`
- `nova-7b-lora-v0.3-20260320`
- `nova-7b-fullft-v0.3-20260401`

The date suffix ensures uniqueness even for identical configurations.
