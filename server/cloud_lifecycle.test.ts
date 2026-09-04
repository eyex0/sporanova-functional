import { describe, it, expect } from 'vitest';
import { NovaModelLifecycle } from '../training/cloud/lifecycle';
import { NovaTrainingOrchestrator, buildCheckpointProvenance } from '../training/cloud/jobs/orchestrator';
import {
  REQUIRED_EVAL_CATEGORIES,
  RealEvaluationHarness,
  makeSyntheticBaseResult,
} from '../training/cloud/evaluation/real_evaluation';
import { CheckpointProvenance, EvaluationComparison, NovaTrainingJob } from '../types';

function makeJobAndCheckpoint(): { job: NovaTrainingJob; checkpoint: CheckpointProvenance } {
  const orch = new NovaTrainingOrchestrator();
  const job = orch.createJob({
    model_name: 'nova',
    model_version: 'v0.6',
    base_model: 'Qwen/Qwen2.5-72B-Instruct',
    training_method: 'qlora',
    dataset_version: 'v0.5.1',
    dataset_hash: 'sha256:dataset',
    config_path: 'training/configs/nova-qlora.yaml',
    config_hash: 'sha256:cfg',
    gpu: {
      provider: 'runpod',
      gpu_type: 'a100-80gb',
      gpu_count: 1,
      vram_gb: 80,
      estimated_cost_per_hour: 1.99,
      max_runtime_hours: 24,
    },
    hyperparameters: {
      learning_rate: 2e-4, batch_size: 4, gradient_accumulation: 8, effective_batch_size: 32,
      epochs: 1, warmup_steps: 50, max_seq_length: 4096, gradient_checkpointing: true,
      bf16: true, fp16: false, seed: 42, weight_decay: 0.01, max_grad_norm: 1.0,
      lr_scheduler_type: 'cosine', optim: 'paged_adamw_8bit', logging_steps: 10,
      save_steps: 200, eval_steps: 200, save_total_limit: 3, lora_r: 64, lora_alpha: 128, lora_dropout: 0.05,
    },
    seed: 42,
  });
  orch.start(job.job_id);
  orch.complete(job.job_id, { total_runtime_seconds: 100, total_cost_usd: 1 });
  const cp = buildCheckpointProvenance({
    checkpoint_provenance_id: 'cp-v0.6',
    job: orch.get(job.job_id)!,
    checkpoint_size_bytes: 1024,
    adapter_sha256: 'sha256:adapter',
  });
  return { job: orch.get(job.job_id)!, checkpoint: cp };
}

describe('NovaModelLifecycle', () => {
  it('registers the foundation model as PRODUCTION', () => {
    const lc = new NovaModelLifecycle();
    const f = lc.registerFoundation({ model_name: 'qwen', version: 'qwen2.5-72b-instruct', base_model: 'Qwen/Qwen2.5-72B-Instruct' });
    expect(f.status).toBe('PRODUCTION');
    expect(lc.getProduction()?.model_id).toBe(f.model_id);
  });

  it('moves a model through the full lifecycle', () => {
    const lc = new NovaModelLifecycle();
    const { job, checkpoint } = makeJobAndCheckpoint();
    const rec = lc.registerFromJob(job, checkpoint);
    expect(rec.status).toBe('TRAINING');
    lc.moveToEvaluation(rec.model_id);
    lc.moveToCandidate(rec.model_id);
    lc.moveToApproved(rec.model_id);
    // Promote requires no other model in PRODUCTION
    const f = lc.registerFoundation({ model_name: 'qwen', version: 'qwen2.5-72b-instruct', base_model: 'Qwen/Qwen2.5-72B-Instruct' });
    // Deprecate the foundation
    lc.deprecate(f.model_id, 'replaced by NOVA v0.6');
    lc.moveToProduction(rec.model_id);
    expect(lc.getProduction()?.model_id).toBe(rec.model_id);
  });

  it('rejects a promotion when another model is in PRODUCTION', () => {
    const lc = new NovaModelLifecycle();
    const f = lc.registerFoundation({ model_name: 'qwen', version: 'qwen2.5-72b-instruct', base_model: 'Qwen/Qwen2.5-72B-Instruct' });
    const { job, checkpoint } = makeJobAndCheckpoint();
    const rec = lc.registerFromJob(job, checkpoint);
    lc.moveToEvaluation(rec.model_id);
    lc.moveToCandidate(rec.model_id);
    lc.moveToApproved(rec.model_id);
    expect(() => lc.moveToProduction(rec.model_id)).toThrow(/currently in PRODUCTION/);
  });

  it('performs a rollback to a deprecated model', () => {
    const lc = new NovaModelLifecycle();
    const f = lc.registerFoundation({ model_name: 'qwen', version: 'qwen2.5-72b-instruct', base_model: 'Qwen/Qwen2.5-72B-Instruct' });
    // Register a candidate and promote it to PRODUCTION
    const { job, checkpoint } = makeJobAndCheckpoint();
    const rec = lc.registerFromJob(job, checkpoint);
    lc.moveToEvaluation(rec.model_id);
    lc.moveToCandidate(rec.model_id);
    lc.moveToApproved(rec.model_id);
    // Deprecate foundation so it can be rolled back to
    lc.deprecate(f.model_id, 'replaced by candidate');
    // Promote candidate to PRODUCTION
    lc.moveToProduction(rec.model_id);
    expect(lc.getProduction()?.model_id).toBe(rec.model_id);
    // Now roll back from the candidate to the deprecated foundation
    const ev = lc.rollbackTo(f.model_id, 'reverting a bad candidate', 'operator-1');
    expect(ev.target_model_id).toBe(f.model_id);
    expect(lc.getProduction()?.model_id).toBe(f.model_id);
    expect(lc.getRollbackHistory().length).toBe(1);
  });

  it('runs an A/B test between two models', () => {
    const lc = new NovaModelLifecycle();
    const f = lc.registerFoundation({ model_name: 'qwen', version: 'qwen2.5-72b-instruct', base_model: 'Qwen/Qwen2.5-72B-Instruct' });
    const { job, checkpoint } = makeJobAndCheckpoint();
    const rec = lc.registerFromJob(job, checkpoint);
    const ab = lc.startABTest({
      production_model_id: f.model_id,
      candidate_model_id: rec.model_id,
      traffic_percentage: 10,
    });
    expect(ab.status).toBe('RUNNING');
    lc.recordABMetrics(ab.test_id, 'candidate', { sample_count: 100, avg_latency_ms: 200 });
    lc.completeABTest(ab.test_id, 'PROMOTE', 'operator-1');
    expect(lc.getABTest(ab.test_id)?.decision).toBe('PROMOTE');
  });

  it('registers and deploys an inference endpoint', () => {
    const lc = new NovaModelLifecycle();
    const ep = lc.registerEndpoint({
      model_id: 'nova-v0.6',
      base_model: 'Qwen/Qwen2.5-72B-Instruct',
      engine: 'vllm',
      openai_compatible: true,
      max_concurrent_requests: 32,
      max_context_tokens: 8192,
    });
    expect(ep.status).toBe('DRAFT');
    lc.setEndpointStatus(ep.endpoint_id, 'DEPLOYED');
    expect(lc.getEndpoint(ep.endpoint_id)?.status).toBe('DEPLOYED');
  });
});

describe('RealEvaluationHarness', () => {
  it('builds an evaluation spec', () => {
    const h = new RealEvaluationHarness();
    const spec = h.buildSpec({
      base_model: 'Qwen/Qwen2.5-72B-Instruct',
      candidate_checkpoint: 's3://x',
      candidate_checkpoint_id: 'cp-1',
      base_checkpoint: 'BASE',
    });
    expect(spec.categories.length).toBe(REQUIRED_EVAL_CATEGORIES.length);
    expect(spec.chat_template).toBe('qwen2.5');
  });

  it('compares BASE vs CANDIDATE and detects regression / improvement', () => {
    const h = new RealEvaluationHarness();
    const base = makeSyntheticBaseResult({
      baseModel: 'Qwen/Qwen2.5-72B-Instruct',
      accuracyByCategory: {
        enterprise_reasoning: 0.6,
        tool_calling: 0.6,
        sql: 0.6,
        coding: 0.6,
        rag_usage: 0.6,
        memory_usage: 0.6,
        arabic: 0.6,
        english: 0.6,
        arabic_english_code_switching: 0.6,
        security_sensitive: 0.6,
        prompt_injection_defense: 0.6,
        workflow_execution: 0.6,
        agent_planning: 0.6,
        multi_step_tool_execution: 0.6,
      },
    });
    // Candidate: better in most categories, much worse in sql
    const candidateResult = JSON.parse(JSON.stringify(base));
    for (const cat of REQUIRED_EVAL_CATEGORIES) {
      if (cat === 'sql') {
        candidateResult.categories[cat].passed = 0;
        candidateResult.categories[cat].accuracy = 0;
      } else {
        candidateResult.categories[cat].passed = candidateResult.categories[cat].total;
        candidateResult.categories[cat].accuracy = 1.0;
      }
    }
    candidateResult.checkpoint_path = 's3://candidate';

    const comparison = h.compare({
      base_result: base,
      candidate_result: candidateResult,
      candidate_version: 'v0.6',
      candidate_checkpoint_id: 'cp-1',
    });

    expect(comparison.overall.winner).toBe('CANDIDATE');
    expect(comparison.regression_categories).toContain('sql');
    expect(comparison.improvement_categories.length).toBeGreaterThan(0);
  });

  it('validates the shape of an evaluation result', () => {
    const h = new RealEvaluationHarness();
    expect(() => h.validateResult({})).toThrow();
    const base = makeSyntheticBaseResult({ baseModel: 'X', accuracyByCategory: {} });
    expect(() => h.validateResult(base)).not.toThrow();
  });
});

describe('NovaModelLifecycle promotion gates', () => {
  it('rejects promotion when gates fail', () => {
    const lc = new NovaModelLifecycle();
    const { job, checkpoint } = makeJobAndCheckpoint();
    const rec = lc.registerFromJob(job, checkpoint);
    lc.moveToEvaluation(rec.model_id);

    const base = makeSyntheticBaseResult({ baseModel: 'X', accuracyByCategory: {} });
    const cand = JSON.parse(JSON.stringify(base));
    cand.checkpoint_path = 's3://cand';
    const h = new RealEvaluationHarness();
    const comparison = h.compare({
      base_result: base,
      candidate_result: cand,
      candidate_version: 'v0.6',
      candidate_checkpoint_id: checkpoint.checkpoint_id,
    });
    expect(() => lc.approve({
      comparison,
      checkpoint,
      safety_approved: false,
      regression_approved: false,
      reviewer_id: '',
    })).toThrow(/Promotion gates failed/);
  });

  it('passes when all gates are green', () => {
    const lc = new NovaModelLifecycle();
    const f = lc.registerFoundation({ model_name: 'qwen', version: 'qwen2.5-72b-instruct', base_model: 'Qwen/Qwen2.5-72B-Instruct' });
    const { job, checkpoint } = makeJobAndCheckpoint();
    const rec = lc.registerFromJob(job, checkpoint);
    lc.moveToEvaluation(rec.model_id);
    lc.deprecate(f.model_id, 'replaced by NOVA v0.6');

    const base = makeSyntheticBaseResult({ baseModel: 'X', accuracyByCategory: {} });
    const cand = JSON.parse(JSON.stringify(base));
    cand.checkpoint_path = 's3://cand';
    for (const cat of REQUIRED_EVAL_CATEGORIES) {
      cand.categories[cat].passed = cand.categories[cat].total;
      cand.categories[cat].accuracy = 1.0;
    }
    const h = new RealEvaluationHarness();
    const comparison = h.compare({
      base_result: base,
      candidate_result: cand,
      candidate_version: 'v0.6',
      candidate_checkpoint_id: checkpoint.checkpoint_id,
    });
    const promoted = lc.approve({
      comparison,
      checkpoint,
      safety_approved: true,
      regression_approved: false,
      reviewer_id: 'reviewer-1',
    });
    expect(promoted.status).toBe('APPROVED');
  });
});
