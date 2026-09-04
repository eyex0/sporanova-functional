# GPU Providers

## Interface

Every GPU provider implements `NovaGPUProvider`:

```typescript
interface NovaGPUProvider {
  readonly provider: GPUProvider;
  estimateCost(config: GPUConfig, runtimeHours: number): number;
  submitJob(params: GPUJobSubmissionParams): Promise<GPUJobSubmitResult>;
  getJobStatus(providerJobId: string): Promise<GPUJobStatus>;
  getLogs(providerJobId: string, tail?: number): Promise<string>;
  cancelJob(providerJobId: string): Promise<void>;
  downloadCheckpoint(providerJobId: string, localPath: string): Promise<string>;
}
```

## Supported Providers

| Provider | Status | GPU Types | Notes |
|----------|--------|-----------|-------|
| RunPod | Stub | A100-80GB, A100-40GB, H100, A6000 | Best cost/performance for QLoRA |
| AWS | Stub | p4d.24xlarge (8×A100), p5.48xlarge (8×H100) | Enterprise compliance, highest cost |
| Lambda | Catalog only | A100-80GB, H100 | Fast startup, good pricing |
| Modal | Catalog only | A100-80GB, H100 | Serverless GPU, pay-per-second |
| Vast | Catalog only | RTX 3090, A100-80GB, A100-40GB | Cheapest, less reliable |
| GCP | Catalog only | A100-80GB, H100 | Good for GCP-native stacks |
| Azure | Catalog only | ND96asr_v4 (8×A100), ND96amsr_A100_v4 | Enterprise Azure compliance |

## Cost Estimation

Use `estimateJobCost(gpuConfig, runtimeHours)` to get USD estimates:

```typescript
const cost = estimateJobCost({
  provider: 'runpod',
  gpu_type: 'a100-80gb',
  gpu_count: 1,
  vram_gb: 80,
  estimated_cost_per_hour: 1.99,
  max_runtime_hours: 24,
}, 24);
// → ~$47.76
```

## Provider Registration

```typescript
import { buildDefaultProviderRegistry } from '../providers/gpu_provider';
const registry = buildDefaultProviderRegistry();
const provider = registry.get('runpod');
```

## Mock Provider

The `MockGPUProvider` simulates all operations in-memory.  Status transitions
follow a deterministic path: QUEUED → RUNNING → COMPLETED.

## Adding a New Provider

1. Create `providers/your-provider.ts`
2. Implement `NovaGPUProvider`
3. Register with `NovaGPUProviderRegistry`
