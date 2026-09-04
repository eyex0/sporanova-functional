// AWS GPU Provider Stub
//
// To enable: set SOPRANOVA_AWS_PROVIDER_ENABLED=1 and supply credentials via
// the AWS SDK default chain (env vars, IAM role, ~/.aws, etc.).
// This file documents the SDK calls that the real adapter must make and the
// IAM permissions that are required. It does NOT execute anything at import
// time and does NOT pull in the AWS SDK at module load — that is a runtime
// concern of the future adapter.

import {
  NovaGPUProvider,
  JobSubmissionRequest,
  JobStatusSnapshot,
  GPUConfig,
  estimateJobCost,
} from './gpu_provider';
import { GPUProvider } from '../../types';

export const AWS_PROVIDER_DOCS = `
# AWS GPU Provider

Enabled when SOPRANOVA_AWS_PROVIDER_ENABLED=1.

## Required IAM permissions

- ec2:RunInstances
- ec2:DescribeInstances
- ec2:TerminateInstances
- s3:GetObject / s3:PutObject on the training bucket
- logs:CreateLogStream / logs:PutLogEvents
- secretsmanager:GetSecretValue on the training secret prefix
- ssm:GetParameter for non-secret config (optional)

## Submitting a job

1. Render a launch template (Amazon EC2) that pulls the training Docker image,
   mounts the dataset + output S3 paths via s3fs or the S3 CLI, and runs
   training/qlora/train.py as PID 1.
2. ec2:RunInstances with the chosen GPU instance type (e.g. p4d.24xlarge
   for 8x A100, p5.48xlarge for 8x H100).
3. The instance itself is responsible for reporting its status via a small
   sidecar that writes to S3 + CloudWatch.

## Cost

See GPU_COST_CATALOG[provider='aws'] in gpu_provider.ts.

## Secret handling

Secrets are NEVER embedded in the launch template. The instance profile
grants access to AWS Secrets Manager and the training script fetches them
at boot. The repo contains no actual secret values.
`;

export class AWSGPUProviderStub implements NovaGPUProvider {
  readonly provider: GPUProvider = 'aws';
  // Real implementation would be:
  // private ec2: EC2Client;
  // private s3: S3Client;
  // private secrets: SecretsManagerClient;
  // constructor() { this.ec2 = new EC2Client({...}); ... }
  // async submitJob(...) { ... }

  estimateCost(gpu: GPUConfig, runtimeHours: number): number {
    return estimateJobCost(gpu, runtimeHours);
  }

  // The methods below are intentionally throw-y; the real adapter must
  // implement them and the surrounding code must guard behind the
  // SOPRANOVA_AWS_PROVIDER_ENABLED env var.
  async submitJob(_req: JobSubmissionRequest): Promise<{ provider_job_id: string }> {
    throw new Error('AWSGPUProvider is a stub. Enable by setting SOPRANOVA_AWS_PROVIDER_ENABLED=1 and providing the AWS SDK implementation.');
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
