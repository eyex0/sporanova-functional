# Cost Control

## Budget System

The `TrainingBudget` type provides hard limits:

```typescript
interface TrainingBudget {
  max_gpu_hours: number;
  max_cost_usd: number;
  max_concurrent_jobs: number;
}
```

## Default Budget

```typescript
const orch = new NovaTrainingOrchestrator({
  budget: {
    max_gpu_hours: 48,       // 2 days max
    max_cost_usd: 100,       // $100 max
    max_concurrent_jobs: 2,  // 2 jobs running simultaneously
  },
});
```

## Cost Estimation by Provider

| Provider | GPU | $/hr | 24hr Est | Monthly Est |
|----------|-----|------|----------|-------------|
| RunPod | A100-80GB | $1.99 | $47.76 | $1,432.80 |
| RunPod | H100 | $3.89 | $93.36 | $2,800.80 |
| AWS | p4d.24xlarge | $32.77 | $786.48 | $23,594.40 |
| Lambda | A100-80GB | $1.29 | $30.96 | $928.80 |
| Vast | A100-80GB | $0.89 | $21.36 | $640.80 |
| GCP | A100-80GB | $2.95 | $70.80 | $2,124.00 |
| Azure | ND96asr_v4 | $32.00 | $768.00 | $23,040.00 |

## Recommended Configuration

For NOVA QLoRA training on Qwen2.5-72B-Instruct:

- **Provider**: RunPod (best cost/performance)
- **GPU**: A100-80GB (sufficient for 72B QLoRA)
- **Runtime**: 24 hours max
- **Budget**: $50 per job

## Cost Monitoring

```typescript
const obs = new TrainingObservability();
obs.recordCost(jobId, { cost_usd: 8, tokens: 1_000_000_000 });
const totalCost = obs.getTotalCost(); // cumulative USD
```

## Anti-Spending Measures

1. **Budget validation** — Jobs are rejected before submission if they exceed limits
2. **Runtime limits** — Jobs are cancelled if they exceed max_runtime_hours
3. **Concurrent caps** — Only N jobs can run simultaneously
4. **Cost alerts** — Observability tracks cumulative spend
5. **Manual approval** — No job starts without human intervention
