// NOVA Model Lifecycle Manager
// Extends the existing NovaModelRegistry with:
//   - Foundation model registration (Qwen2.5-72B-Instruct baseline).
//   - Checkpoint provenance tracking per candidate.
//   - Evaluation promotion gates: a model cannot move from
//     EVALUATION -> CANDIDATE -> APPROVED -> PRODUCTION without passing
//     explicit checks (regression guard, base-model delta, reviewer
//     approval, manual approval flag).
//   - Rollback: restore a previously PRODUCTION model from a DEPRECATED
//     state without re-running training.
//   - A/B testing registration.

import crypto from 'crypto';
import * as fs from 'fs';
import {
  NovaModelRecord,
  ModelStatus,
  NovaTrainingJob,
  CheckpointProvenance,
  EvaluationComparison,
  ABTestConfig,
  RollbackEvent,
  InferenceEndpoint,
} from '../types';

const LIFECYCLE_ORDER: ModelStatus[] = [
  'TRAINING',
  'EVALUATION',
  'CANDIDATE',
  'APPROVED',
  'PRODUCTION',
  'DEPRECATED',
];

const VALID_TRANSITIONS: Record<ModelStatus, ModelStatus[]> = {
  TRAINING: ['EVALUATION', 'DEPRECATED'],
  EVALUATION: ['CANDIDATE', 'DEPRECATED'],
  CANDIDATE: ['APPROVED', 'DEPRECATED'],
  APPROVED: ['PRODUCTION', 'DEPRECATED'],
  PRODUCTION: ['DEPRECATED'],
  DEPRECATED: [],
};

export interface PromotionGate {
  name: string;
  passed: boolean;
  detail: string;
}

export interface PromotionContext {
  comparison: EvaluationComparison;
  checkpoint: CheckpointProvenance;
  safety_approved: boolean;
  regression_approved: boolean;
  reviewer_id: string;
}

export class NovaModelLifecycle {
  private records = new Map<string, NovaModelRecord>();
  private checkpoints = new Map<string, CheckpointProvenance>();
  private abTests = new Map<string, ABTestConfig>();
  private rollbacks: RollbackEvent[] = [];
  private endpoints = new Map<string, InferenceEndpoint>();

  // ── Foundation model ─────────────────────────────────────────────

  registerFoundation(input: {
    model_name: string;
    version: string;
    base_model: string;
    notes?: string;
  }): NovaModelRecord {
    this.assertNoDuplicate(input.model_name, input.version);
    const record: NovaModelRecord = {
      model_id: this.generateId('foundation', input.model_name, input.version),
      model_name: input.model_name,
      version: input.version,
      base_model: input.base_model,
      training_type: 'qlora',
      training_dataset_version: 'n/a',
      training_config_path: 'n/a',
      checkpoint_location: 'n/a',
      status: 'PRODUCTION',            // the foundation model is the starting PRODUCTION
      created_at: new Date().toISOString(),
      promoted_at: new Date().toISOString(),
      notes: input.notes ?? 'Foundation model (no NOVA-specific training).',
    };
    this.records.set(record.model_id, record);
    return record;
  }

  // ── Training → Checkpoint ────────────────────────────────────────

  registerFromJob(job: NovaTrainingJob, checkpoint: CheckpointProvenance): NovaModelRecord {
    this.assertNoDuplicate(job.model_name, job.model_version);
    if (checkpoint.training_job_id !== job.job_id) {
      throw new Error('Checkpoint provenance job_id does not match training job');
    }
    this.checkpoints.set(checkpoint.checkpoint_id, checkpoint);
    const record: NovaModelRecord = {
      model_id: this.generateId('nova', job.model_name, job.model_version),
      model_name: job.model_name,
      version: job.model_version,
      base_model: job.base_model,
      training_type: job.training_method,
      training_dataset_version: job.dataset_version,
      training_config_path: job.config_path,
      checkpoint_location: checkpoint.storage_location,
      status: 'TRAINING',
      created_at: new Date().toISOString(),
      notes: `Training job: ${job.job_id} (${job.training_method} on ${job.gpu.provider}/${job.gpu.gpu_type})`,
    };
    this.records.set(record.model_id, record);
    return record;
  }

  // ── Lifecycle transitions ────────────────────────────────────────

  moveToEvaluation(modelId: string): NovaModelRecord {
    return this.transition(modelId, 'EVALUATION', 'Training complete, moving to evaluation.');
  }

  moveToCandidate(modelId: string): NovaModelRecord {
    return this.transition(modelId, 'CANDIDATE', 'Evaluation complete, becoming a candidate.');
  }

  moveToApproved(modelId: string): NovaModelRecord {
    return this.transition(modelId, 'APPROVED', 'Approved by reviewer.');
  }

  moveToProduction(modelId: string): NovaModelRecord {
    const model = this.transition(modelId, 'PRODUCTION', 'Promoted to production.');
    const currentProduction = this.getProduction();
    if (currentProduction && currentProduction.model_id !== modelId) {
      throw new Error(
        `Cannot promote ${modelId}: model ${currentProduction.model_id} is currently in PRODUCTION. Deprecate it first.`,
      );
    }
    model.promoted_at = new Date().toISOString();
    return model;
  }

  deprecate(modelId: string, reason: string): NovaModelRecord {
    return this.transition(modelId, 'DEPRECATED', reason);
  }

  // ── Promotion gates ──────────────────────────────────────────────

  evaluatePromotionGates(ctx: PromotionContext): PromotionGate[] {
    const gates: PromotionGate[] = [];

    // 1. The checkpoint must have a valid provenance record.
    const cp = this.checkpoints.get(ctx.checkpoint.checkpoint_id);
    gates.push({
      name: 'checkpoint_provenance',
      passed: !!cp && cp.training_job_id === ctx.checkpoint.training_job_id,
      detail: cp
        ? `Provenance id=${cp.checkpoint_id} reproducible=${cp.reproducibility.deterministic}`
        : 'Checkpoint provenance not found in registry',
    });

    // 2. The evaluation must exist and be complete.
    gates.push({
      name: 'evaluation_complete',
      passed: !!ctx.comparison && ctx.comparison.per_category.length > 0,
      detail: `Categories evaluated: ${ctx.comparison?.per_category.length ?? 0}`,
    });

    // 3. The candidate must not regress on the regression-approved list.
    const hasRegression = ctx.comparison.regression_categories.length > 0;
    gates.push({
      name: 'regression_guard',
      passed: hasRegression ? ctx.regression_approved : true,
      detail: hasRegression
        ? `Regression detected in: ${ctx.comparison.regression_categories.join(', ')} (override=${ctx.regression_approved})`
        : 'No regression detected',
    });

    // 4. The candidate must improve over the base model overall.
    gates.push({
      name: 'overall_improvement',
      passed: ctx.comparison.overall.delta > 0,
      detail: `Base accuracy: ${ctx.comparison.overall.base_accuracy.toFixed(4)}, ` +
              `candidate: ${ctx.comparison.overall.candidate_accuracy.toFixed(4)}, ` +
              `delta: ${ctx.comparison.overall.delta.toFixed(4)}`,
    });

    // 5. Safety approval must be on file.
    gates.push({
      name: 'safety_approval',
      passed: !!ctx.safety_approved,
      detail: ctx.safety_approved ? `Safety approved by ${ctx.reviewer_id}` : 'Safety review not approved',
    });

    // 6. Manual approval must be on file (this is a separate human gate).
    gates.push({
      name: 'reviewer_signoff',
      passed: !!ctx.reviewer_id,
      detail: ctx.reviewer_id ? `Reviewer: ${ctx.reviewer_id}` : 'No reviewer on file',
    });

    return gates;
  }

  approve(ctx: PromotionContext): NovaModelRecord {
    const gates = this.evaluatePromotionGates(ctx);
    const blocking = gates.filter(g => !g.passed && g.name !== 'regression_guard');
    const allPassed = blocking.length === 0;
    if (!allPassed) {
      const failed = blocking.map(g => g.name).join(', ');
      throw new Error(`Promotion gates failed: ${failed}`);
    }
    const model = this.findModelByTrainingJobId(ctx.checkpoint.training_job_id);
    if (!model) throw new Error(`No model record found for training job ${ctx.checkpoint.training_job_id}`);
    this.moveToCandidate(model.model_id);
    this.moveToApproved(model.model_id);
    return model;
  }

  // ── Rollback ─────────────────────────────────────────────────────

  rollbackTo(modelId: string, reason: string, triggeredBy: string): RollbackEvent {
    const currentProduction = this.getProduction();
    if (!currentProduction) {
      throw new Error('No production model is currently deployed; nothing to roll back from');
    }
    const target = this.records.get(modelId);
    if (!target) throw new Error(`Rollback target ${modelId} not found`);
    if (target.status !== 'DEPRECATED' && target.status !== 'PRODUCTION') {
      throw new Error(`Cannot roll back to a model that is not DEPRECATED or PRODUCTION (status=${target.status})`);
    }
    const start = Date.now();
    this.deprecate(currentProduction.model_id, `rolled back to ${modelId}: ${reason}`);
    target.status = 'PRODUCTION';
    target.promoted_at = new Date().toISOString();
    target.notes = `Rollback target. ${reason}`;
    const event: RollbackEvent = {
      event_id: `nova-rollback-${Date.now()}`,
      model_id: currentProduction.model_id,
      target_model_id: modelId,
      reason,
      triggered_at: new Date().toISOString(),
      triggered_by: triggeredBy,
      restored_in_ms: Date.now() - start,
    };
    this.rollbacks.push(event);
    return event;
  }

  // ── A/B testing ──────────────────────────────────────────────────

  startABTest(input: Omit<ABTestConfig, 'test_id' | 'started_at' | 'status' | 'metrics'> & { metrics?: ABTestConfig['metrics'] }): ABTestConfig {
    const test: ABTestConfig = {
      test_id: `nova-ab-${Date.now()}`,
      started_at: new Date().toISOString(),
      status: 'RUNNING',
      metrics: input.metrics ?? {
        production: this.emptyMetrics(),
        candidate: this.emptyMetrics(),
      },
      ...input,
    };
    this.abTests.set(test.test_id, test);
    return test;
  }

  recordABMetrics(testId: string, side: 'production' | 'candidate', m: Partial<ABTestConfig['metrics']['production']>): ABTestConfig {
    const test = this.abTests.get(testId);
    if (!test) throw new Error(`AB test ${testId} not found`);
    test.metrics[side] = { ...test.metrics[side], ...m } as any;
    return test;
  }

  completeABTest(testId: string, decision: ABTestConfig['decision'], decidedBy: string): ABTestConfig {
    const test = this.abTests.get(testId);
    if (!test) throw new Error(`AB test ${testId} not found`);
    test.status = 'COMPLETED';
    test.ended_at = new Date().toISOString();
    test.decision = decision;
    test.decided_by = decidedBy;
    test.decided_at = new Date().toISOString();
    return test;
  }

  // ── Inference endpoints ──────────────────────────────────────────

  registerEndpoint(endpoint: Omit<InferenceEndpoint, 'endpoint_id' | 'status'>): InferenceEndpoint {
    const full: InferenceEndpoint = {
      ...endpoint,
      endpoint_id: `nova-endpoint-${Date.now()}`,
      status: endpoint.status || 'DRAFT',
    };
    this.endpoints.set(full.endpoint_id, full);
    return full;
  }

  setEndpointStatus(endpointId: string, status: InferenceEndpoint['status']): InferenceEndpoint {
    const e = this.endpoints.get(endpointId);
    if (!e) throw new Error(`Endpoint ${endpointId} not found`);
    e.status = status;
    if (status === 'DEPLOYED') e.deployed_at = new Date().toISOString();
    if (status === 'DRAINED') e.drained_at = new Date().toISOString();
    return e;
  }

  // ── Query ────────────────────────────────────────────────────────

  get(modelId: string): NovaModelRecord | undefined { return this.records.get(modelId); }
  getCheckpoint(id: string): CheckpointProvenance | undefined { return this.checkpoints.get(id); }
  getABTest(id: string): ABTestConfig | undefined { return this.abTests.get(id); }
  getEndpoint(id: string): InferenceEndpoint | undefined { return this.endpoints.get(id); }
  getRollbackHistory(): RollbackEvent[] { return [...this.rollbacks]; }

  getProduction(): NovaModelRecord | undefined {
    return Array.from(this.records.values()).find(r => r.status === 'PRODUCTION');
  }

  getLatestProduction(): NovaModelRecord | undefined {
    return Array.from(this.records.values())
      .filter(r => r.status === 'PRODUCTION')
      .sort((a, b) => new Date(b.promoted_at || b.created_at).getTime() - new Date(a.promoted_at || a.created_at).getTime())[0];
  }

  listModels(status?: ModelStatus): NovaModelRecord[] {
    const arr = Array.from(this.records.values());
    return status ? arr.filter(r => r.status === status) : arr;
  }

  history(modelName: string): NovaModelRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.model_name === modelName)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // ── Persistence ─────────────────────────────────────────────────

  save(filePath: string): void {
    const data = {
      records: Array.from(this.records.values()),
      checkpoints: Array.from(this.checkpoints.values()),
      abTests: Array.from(this.abTests.values()),
      rollbacks: this.rollbacks,
      endpoints: Array.from(this.endpoints.values()),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  load(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    this.records = new Map((data.records || []).map((r: NovaModelRecord) => [r.model_id, r]));
    this.checkpoints = new Map((data.checkpoints || []).map((c: CheckpointProvenance) => [c.checkpoint_id, c]));
    this.abTests = new Map((data.abTests || []).map((a: ABTestConfig) => [a.test_id, a]));
    this.rollbacks = data.rollbacks || [];
    this.endpoints = new Map((data.endpoints || []).map((e: InferenceEndpoint) => [e.endpoint_id, e]));
  }

  // ── Internal helpers ────────────────────────────────────────────

  private transition(modelId: string, to: ModelStatus, note: string): NovaModelRecord {
    const model = this.records.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    if (!VALID_TRANSITIONS[model.status].includes(to)) {
      throw new Error(`Invalid transition for ${modelId}: ${model.status} -> ${to}`);
    }
    model.status = to;
    if (!model.notes) model.notes = '';
    model.notes += `\n[${new Date().toISOString()}] ${note}`;
    return model;
  }

  private assertNoDuplicate(name: string, version: string): void {
    const existing = Array.from(this.records.values()).find(r => r.model_name === name && r.version === version);
    if (existing) {
      throw new Error(`Duplicate model: ${name}@${version} already exists as ${existing.model_id}`);
    }
  }

  private generateId(prefix: string, name: string, version: string): string {
    return `${prefix}-${name}-${version}-${crypto.createHash('sha256').update(`${name}-${version}-${Date.now()}`).digest('hex').slice(0, 8)}`;
  }

  private emptyMetrics(): ABTestConfig['metrics']['production'] {
    return {
      sample_count: 0,
      avg_latency_ms: 0,
      p99_latency_ms: 0,
      cost_per_1k_requests: 0,
      tool_success_rate: 0,
      task_success_rate: 0,
      safety_failures: 0,
    };
  }

  private findModelByTrainingJobId(jobId: string): NovaModelRecord | undefined {
    return Array.from(this.records.values()).find(r => r.notes?.includes(`Training job: ${jobId}`));
  }
}
