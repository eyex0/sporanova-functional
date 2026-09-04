// RunPod GPU Provider Stub
//
// To enable: set SOPRANOVA_RUNPOD_PROVIDER_ENABLED=1 and supply
// RUNPOD_API_KEY in the environment. The real adapter talks to the RunPod
// GraphQL API at https://api.runpod.io/graphql.
//
// This file documents the API surface and does NOT execute anything.

import {
  NovaGPUProvider,
  JobSubmissionRequest,
  JobStatusSnapshot,
  GPUConfig,
  estimateJobCost,
} from './gpu_provider';
import { GPUProvider } from '../../types';

export const RUNPOD_PROVIDER_DOCS = `
# RunPod GPU Provider

Enabled when SOPRANOVA_RUNPOD_PROVIDER_ENABLED=1.

## Required environment variables

- RUNPOD_API_KEY         — issued by RunPod (do not commit)
- RUNPOD_DEFAULT_GPU_TYPE — e.g. 'NVIDIA A100 80GB PCIe'
- RUNPOD_DEFAULT_REGION  — e.g. 'US' or 'EU'

## API

- POST /graphql  with mutation: createPod(input)
- query: pod(id) { id, desiredStatus, runtime { gpus, vcpu, memoryInGb } }
- mutation: podStop(id), podTerminate(id)

## Cost

See GPU_COST_CATALOG[provider='runpod'] in gpu_provider.ts.
RunPod prices are roughly 50% of the on-demand AWS / GCP price.

## Secret handling

The RunPod API key is loaded from env, never written to disk, and never
included in logs.
`;

export class RunPodGPUProviderStub implements NovaGPUProvider {
  readonly provider: GPUProvider = 'runpod';

  estimateCost(gpu: GPUConfig, runtimeHours: number): number {
    return estimateJobCost(gpu, runtimeHours);
  }

  async submitJob(_req: JobSubmissionRequest): Promise<{ provider_job_id: string }> {
    throw new Error('RunPodGPUProvider is a stub. Enable by setting SOPPANOVA_RUNPOD_PROVIDER_ENABLED=1.');
  }
  async getJobStatus(_providerJobId: string): Promise<JobStatusSnapshot> {
    throw new Error('not implemented in stub');
  }
  async getLogs(_providerJobId: string, _tailLines: number): Promise<string> {
    throw new Error('not implemented in stub');
  }
  async cancelJob(_providerJobId: string): Promise<void> {
    throw new Error('not implemented in stub');
  }
  async downloadCheckpoint(_providerJobId: string, _localPath: string): Promise<string> {
    throw new Error('not implemented in stub');
  }
  async release(_providerJobId: string): Promise<void> {
    throw new Error('not implemented in stub');
  }
}
