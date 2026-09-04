import { describe, it, expect } from 'vitest';
import {
  GPU_COST_CATALOG,
  MockGPUProvider,
  NovaGPUProviderRegistry,
  buildDefaultProviderRegistry,
  estimateJobCost,
} from '../training/cloud/providers/gpu_provider';
import { GPUConfig } from '../types';

const a100: GPUConfig = {
  provider: 'aws',
  gpu_type: 'a100-80gb',
  gpu_count: 1,
  vram_gb: 80,
  estimated_cost_per_hour: 4.10,
  max_runtime_hours: 24,
};

describe('GPU provider abstraction', () => {
  it('exposes a cost catalog for every known provider', () => {
    const providers = Object.keys(GPU_COST_CATALOG);
    expect(providers.length).toBeGreaterThan(5);
    expect(providers).toContain('aws');
    expect(providers).toContain('runpod');
    expect(providers).toContain('lambda');
    expect(providers).toContain('modal');
    expect(providers).toContain('vast');
    expect(providers).toContain('gcp');
    expect(providers).toContain('azure');
  });

  it('estimates job cost from a GPU config', () => {
    const cost = estimateJobCost(a100, 24);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeCloseTo(4.10 * 24, 1);
  });

  it('scales by gpu_count', () => {
    const single = estimateJobCost(a100, 1);
    const quad = estimateJobCost({ ...a100, gpu_count: 4 }, 1);
    expect(quad).toBeCloseTo(single * 4, 5);
  });

  it('uses the mock provider as a safe default', () => {
    const registry = buildDefaultProviderRegistry();
    const provider = registry.get('aws');
    expect(provider.provider).toBe('aws');
    expect(typeof provider.estimateCost(a100, 1)).toBe('number');
  });

  it('throws when the requested provider is not registered', () => {
    const reg = new NovaGPUProviderRegistry();
    expect(() => reg.get('aws')).toThrow(/not registered/);
  });

  it('mock provider supports submit, status, logs, cancel, download, release', async () => {
    const provider = new MockGPUProvider('runpod');
    const submit = await provider.submitJob({
      job: { job_id: 'j-1' } as any,
      image_uri: 'docker://x',
      command: ['python', 'train.py'],
      environment: {},
      secret_names: [],
      storage: { dataset_uri: 's3://x', output_uri: 's3://x', checkpoint_uri: 's3://x', logs_uri: 's3://x' },
    });
    expect(submit.provider_job_id).toMatch(/^mock-runpod-/);

    const status = await provider.getJobStatus(submit.provider_job_id);
    expect(status.status).toBe('QUEUED');

    const logs = await provider.getLogs(submit.provider_job_id, 10);
    expect(logs).toContain('mock provider received job');

    await provider.cancelJob(submit.provider_job_id);
    const cancelled = await provider.getJobStatus(submit.provider_job_id);
    expect(cancelled.status).toBe('CANCELLED');

    const dl = await provider.downloadCheckpoint(submit.provider_job_id, '/tmp');
    expect(dl).toContain(submit.provider_job_id);
  });

  it('mock provider supports RUNNING and COMPLETED transitions', async () => {
    const provider = new MockGPUProvider('aws');
    const { provider_job_id } = await provider.submitJob({
      job: { job_id: 'j-2' } as any,
      image_uri: 'docker://x', command: [], environment: {}, secret_names: [],
      storage: { dataset_uri: 's3://x', output_uri: 's3://x', checkpoint_uri: 's3://x', logs_uri: 's3://x' },
    });
    provider._setStatus(provider_job_id, 'RUNNING');
    expect((await provider.getJobStatus(provider_job_id)).status).toBe('RUNNING');
    provider._setStatus(provider_job_id, 'COMPLETED');
    expect((await provider.getJobStatus(provider_job_id)).status).toBe('COMPLETED');
  });
});
