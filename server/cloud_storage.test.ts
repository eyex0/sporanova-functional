import { describe, it, expect } from 'vitest';
import { NovaObjectStorageLayout, DEFAULT_STORAGE_LAYOUT } from '../training/cloud/storage/layout';

describe('NovaObjectStorageLayout', () => {
  it('uses the default bucket and prefix', () => {
    const layout = new NovaObjectStorageLayout();
    expect(layout.describe().bucket).toBe('sopranova-training');
  });

  it('builds a dataset path', () => {
    const layout = new NovaObjectStorageLayout();
    expect(layout.datasetPath('v0.5.1')).toBe('datasets/nova-v0.5.1');
    expect(layout.datasetPath('v0.5.1', 'train.jsonl')).toBe('datasets/nova-v0.5.1/train.jsonl');
  });

  it('builds a checkpoint path', () => {
    const layout = new NovaObjectStorageLayout();
    expect(layout.checkpointPath('v0.5.1', 'qlora')).toBe('checkpoints/nova-qlora-v0.5.1');
    expect(layout.checkpointArtifact('v0.5.1', 'qlora', 'adapter_model.safetensors'))
      .toBe('checkpoints/nova-qlora-v0.5.1/adapter_model.safetensors');
  });

  it('builds an evaluation path', () => {
    const layout = new NovaObjectStorageLayout();
    expect(layout.evaluationPath('v0.5.1', 'eval-001'))
      .toBe('evaluations/nova-v0.5.1/eval-001');
  });

  it('builds a logs path', () => {
    const layout = new NovaObjectStorageLayout();
    expect(layout.logsPath('nova-job-123')).toBe('logs/nova-job-123');
  });

  it('builds a full s3 URI', () => {
    const layout = new NovaObjectStorageLayout();
    expect(layout.toUri('datasets/nova-v0.5.1/train.jsonl'))
      .toBe('s3://sopranova-training/nova/datasets/nova-v0.5.1/train.jsonl');
  });

  it('overrides the bucket when configured', () => {
    const layout = new NovaObjectStorageLayout({ bucket: 'my-bucket', prefix: 'foo' });
    expect(layout.toUri('x.json')).toBe('s3://my-bucket/foo/x.json');
  });

  it('exposes the default layout constant', () => {
    expect(DEFAULT_STORAGE_LAYOUT.bucket).toBe('sopranova-training');
  });
});
