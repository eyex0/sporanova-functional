# Continuous Learning Pipeline

## Overview

The continuous-learning orchestrator converts production conversations into
versioned training candidates.  Every step is gated — raw production data
**never** directly enters the training dataset.

## Pipeline Stages

### Stage 1: Ingest
- Safety check (PII detection, sensitive data patterns)
- Anonymization (names, emails, SSNs, credit cards, IPs)
- Quality scoring (message length, multi-turn, tool usage)
- Creates a `ContinuousCandidate` with `review_status: 'PENDING'`

### Stage 2: Human Review
- Operator reviews candidate quality and relevance
- Approves or rejects with reviewer ID
- Sets `review_status: 'APPROVED'` or `'REJECTED'`

### Stage 3: Dataset Assembly
- Runs contamination guard on every approved candidate
- Re-anonymizes (defense-in-depth)
- Deduplicates by content hash
- Produces a versioned manifest with provenance hash

## Configuration

```typescript
const orch = new NovaContinuousLearningOrchestrator({
  min_quality_score: 0.7,          // reject below this threshold
  require_human_review: true,       // all candidates need manual approval
  max_candidates_per_batch: 5000,
  output_version_prefix: 'cl',
});
```

## Quality Scoring

| Factor | Score Contribution |
|--------|-------------------|
| Base | 0.5 |
| Total chars > 200 | +0.1 |
| Total chars > 500 | +0.1 |
| Total chars > 1000 | +0.05 |
| 2+ messages | +0.05 |
| 4+ messages | +0.05 |
| Both roles present | +0.1 |
| Tool calls (1) | +0.05 |
| Tool calls (2+) | +0.05 |

## Contamination Guard

The guard checks every example for:
- Production patterns (session IDs, request IDs, user-agent)
- Raw data markers in JSON (workspace_id, user_id, session_id)
- Unanonymized PII (only for synthetic examples)
- `is_synthetic` flag consistency
- `metadata.pii_scrubbed` confirmation
