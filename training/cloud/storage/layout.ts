// NOVA Cloud Object Storage Layout
// Configures the standard layout for the SOPRANOVA training object store.
// The repository does NOT actually upload anything — the layout is used by
// every cloud-training module (jobs, checkpoint, evaluation, A/B, serving) to
// agree on a single canonical path scheme.
//
// The default bucket is `sopranova-training`. In production it should be
// overridden via the SOPRANOVA_STORAGE_BUCKET environment variable. The
// layout itself is a pure function and is fully testable.

import { ObjectStorageLayout } from '../types';

export const DEFAULT_STORAGE_BUCKET = 'sopranova-training';

export const DEFAULT_STORAGE_LAYOUT: ObjectStorageLayout = {
  bucket: DEFAULT_STORAGE_BUCKET,
  prefix: 'nova',
  datasets: 'datasets',
  checkpoints: 'checkpoints',
  evaluations: 'evaluations',
  artifacts: 'artifacts',
  logs: 'logs',
  manifests: 'manifests',
  registry: 'registry',
};

export class NovaObjectStorageLayout {
  private layout: ObjectStorageLayout;

  constructor(layout: Partial<ObjectStorageLayout> = {}) {
    this.layout = { ...DEFAULT_STORAGE_LAYOUT, ...layout };
  }

  /** S3 (or GCS / R2 / Azure Blob) URI for a dataset version. */
  datasetPath(version: string, fileName = ''): string {
    return this.join(this.layout.datasets, `nova-${version}`, fileName);
  }

  /** S3 URI for a checkpoint of a given model + method. */
  checkpointPath(modelVersion: string, method: string, subPath = ''): string {
    return this.join(this.layout.checkpoints, `nova-${method}-${modelVersion}`, subPath);
  }

  /** S3 URI for a checkpoint artifact (e.g. adapter_model.safetensors). */
  checkpointArtifact(modelVersion: string, method: string, artifact: string): string {
    return this.checkpointPath(modelVersion, method, artifact);
  }

  /** S3 URI for an evaluation run. */
  evaluationPath(modelVersion: string, evalId: string, fileName = ''): string {
    return this.join(this.layout.evaluations, `nova-${modelVersion}`, evalId, fileName);
  }

  /** S3 URI for training logs. */
  logsPath(jobId: string, fileName = ''): string {
    return this.join(this.layout.logs, jobId, fileName);
  }

  /** S3 URI for general training artifacts (intermediate files). */
  artifactPath(jobId: string, fileName = ''): string {
    return this.join(this.layout.artifacts, jobId, fileName);
  }

  /** S3 URI for a training manifest. */
  manifestPath(jobId: string, fileName = ''): string {
    return this.join(this.layout.manifests, jobId, fileName);
  }

  /** S3 URI for the global model registry. */
  registryPath(fileName = 'registry.json'): string {
    return this.join(this.layout.registry, fileName);
  }

  /** Returns the full s3:// URL for a given sub-path. */
  toUri(subPath: string): string {
    const prefix = this.layout.prefix ? `${this.layout.prefix}/` : '';
    return `s3://${this.layout.bucket}/${prefix}${subPath}`;
  }

  /** Inspect the current layout. */
  describe(): ObjectStorageLayout {
    return { ...this.layout };
  }

  private join(...parts: string[]): string {
    return parts.filter(Boolean).join('/');
  }
}
