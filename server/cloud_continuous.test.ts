import { describe, it, expect } from 'vitest';
import { NovaContinuousLearningOrchestrator } from '../training/cloud/continuous_learning_orchestrator';

describe('NovaContinuousLearningOrchestrator', () => {
  it('rejects conversations that contain sensitive data', () => {
    const orch = new NovaContinuousLearningOrchestrator();
    const candidate = orch.ingest({
      conversation_id: 'c-1',
      workspace_id: 'ws-1',
      messages: [
        { role: 'user', content: 'My SSN is 123-45-6789' },
        { role: 'assistant', content: 'I cannot help with that.' },
      ],
    });
    expect(candidate).toBeNull();
  });

  it('accepts a clean conversation and creates a PENDING candidate', () => {
    const orch = new NovaContinuousLearningOrchestrator();
    const c = orch.ingest({
      conversation_id: 'c-2',
      workspace_id: 'ws-1',
      messages: [
        { role: 'user', content: 'What is the SLA for the auth service? Please provide a detailed breakdown of availability targets, error budgets, and escalation procedures for the current quarter.' },
        { role: 'assistant', content: 'The auth service targets a 99.95% availability SLA measured monthly. This translates to a 21.9-minute error budget per month. Escalation procedures include: P1 incidents within 15 minutes, P2 within 1 hour. The change advisory board reviews all deployments on Tuesdays and Thursdays. Current quarter targets have been met consistently for the past three months.' },
      ],
    });
    expect(c).not.toBeNull();
    expect(c!.safety_checked).toBe(true);
    expect(c!.review_status).toBe('PENDING');
  });

  it('rejects low-quality conversations', () => {
    const orch = new NovaContinuousLearningOrchestrator({ min_quality_score: 0.99 });
    const c = orch.ingest({
      conversation_id: 'c-3',
      workspace_id: 'ws-1',
      messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }],
    });
    expect(c).toBeNull();
  });

  it('produces a versioned dataset from approved candidates', () => {
    const orch = new NovaContinuousLearningOrchestrator();
    const c = orch.ingest({
      conversation_id: 'c-4',
      workspace_id: 'ws-1',
      messages: [
        { role: 'user', content: 'Summarise the new compliance requirements for our Q3 audit. We need to understand the scope, timeline, and any changes from the previous quarter review.' },
        { role: 'assistant', content: 'For Q3 we need to: (1) refresh the evidence index by September 30th, (2) update the SOC2 mapping to reflect the new data retention policies, (3) brief the change advisory board on the updated incident response procedures, and (4) complete the risk assessment for the new microservices architecture before the audit begins on October 15th.' },
      ],
    })!;
    orch.review(c, true, 'reviewer-1');
    const result = orch.buildDataset([c], '2026-W36');
    expect(result.examples.length).toBe(1);
    expect(result.examples[0].is_synthetic).toBe(false);
    expect(result.examples[0].metadata.source).toBe('continuous_learning');
    expect(result.manifest.version).toBe('cl-2026-W36');
    expect(result.provenance_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects candidates that have not been approved', () => {
    const orch = new NovaContinuousLearningOrchestrator();
    const c = orch.ingest({
      conversation_id: 'c-5',
      workspace_id: 'ws-1',
      messages: [
        { role: 'user', content: 'A long enough user prompt for the candidate to be considered. Please provide a thorough analysis of the system architecture and its implications.' },
        { role: 'assistant', content: 'A long enough assistant response that covers a real topic meaningfully. The architecture should follow microservices patterns with proper separation of concerns and clear domain boundaries.' },
      ],
    })!;
    const result = orch.buildDataset([c], '2026-W36');
    expect(result.examples.length).toBe(0);
    expect(result.rejected.length).toBe(1);
  });
});
