import { describe, it, expect } from 'vitest';
import {
  NIGHTLY_PIPELINE,
  WEEKLY_PIPELINE,
  runScheduledPipeline,
} from '../training/cloud/scheduled_pipeline';
import { NovaContinuousLearningOrchestrator } from '../training/cloud/continuous_learning_orchestrator';
import { NovaTrainingOrchestrator } from '../training/cloud/jobs/orchestrator';
import { NovaModelLifecycle } from '../training/cloud/lifecycle';

describe('Scheduled pipeline configuration', () => {
  it('exposes a nightly pipeline that ingests and filters', () => {
    expect(NIGHTLY_PIPELINE.length).toBeGreaterThanOrEqual(3);
    const names = NIGHTLY_PIPELINE.map(s => s.name);
    expect(names).toContain('collect_approved_candidates');
    expect(names).toContain('anonymize');
    expect(names).toContain('quality_filter');
    expect(names).toContain('contamination_detection');
  });

  it('exposes a weekly pipeline that ends with model candidate creation', () => {
    const names = WEEKLY_PIPELINE.map(s => s.name);
    expect(names).toContain('create_dataset_version');
    expect(names).toContain('queue_training_job');
    expect(names).toContain('create_model_candidate');
    // The weekly pipeline must NEVER auto-promote.
    expect(names).not.toContain('promote_to_production');
  });

  it('runs the nightly pipeline and records every step', async () => {
    const ctx = {
      orchestrator: new NovaContinuousLearningOrchestrator(),
      jobOrchestrator: new NovaTrainingOrchestrator(),
      lifecycle: new NovaModelLifecycle(),
      candidates: [],
      week: '2026-W36',
    };
    const result = await runScheduledPipeline('nightly', ctx);
    expect(result.pipeline).toBe('nightly');
    expect(result.steps.length).toBe(NIGHTLY_PIPELINE.length);
    for (const s of result.steps) expect(s.name).toBeTruthy();
  });

  it('runs the weekly pipeline and queues a training job', async () => {
    const ctx = {
      orchestrator: new NovaContinuousLearningOrchestrator(),
      jobOrchestrator: new NovaTrainingOrchestrator(),
      lifecycle: new NovaModelLifecycle(),
      candidates: [],
      week: '2026-W36',
    };
    const result = await runScheduledPipeline('weekly', ctx);
    const queueStep = result.steps.find(s => s.name === 'queue_training_job');
    expect(queueStep).toBeTruthy();
    expect(queueStep!.result.job_id).toMatch(/^nova-job-qlora-/);
    expect(queueStep!.result.status).toBe('QUEUED');
  });
});
