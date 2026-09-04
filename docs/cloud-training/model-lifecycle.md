# Model Lifecycle

## Status Flow

```
                    ┌─────────────────────────────────────┐
                    │                                     │
FOUNDATION:         │  PRODUCTION  ←────────────────┐    │
                    │      │                         │    │
                    │      ↓ (deprecate)             │    │
                    │  DEPRECATED                    │    │
                    │                                │    │
CANDIDATE:   TRAINING → EVALUATION → CANDIDATE → APPROVED → PRODUCTION
                    │                                ↑
                    │                                │
                    └─→ DEPRECATED                   │
                                                     │
                         (rollback from PRODUCTION) ─┘
```

## Foundation Registration

The foundation model (Qwen2.5-72B-Instruct) is registered as PRODUCTION at
startup.  This represents the starting point before NOVA-specific training.

## Promotion Gates (6 gates)

A candidate cannot be promoted without passing:

1. **checkpoint_provenance** — Checkpoint has a valid provenance record
2. **evaluation_complete** — Evaluation has been completed with scores
3. **regression_guard** — No regression in any evaluation category (soft)
4. **overall_improvement** — Candidate accuracy > base accuracy
5. **safety_approval** — Safety team has approved the candidate
6. **reviewer_signoff** — A named human reviewer has signed off

## Rollback

Rollback restores a previously PRODUCTION model from a DEPRECATED state:

```typescript
lifecycle.rollbackTo(foundationModelId, 'reverting bad candidate', 'reviewer-1');
```

Rollback automatically deprecates the current production model and restores the target.

## A/B Testing

```typescript
const ab = lifecycle.startABTest({
  production_model_id: 'current-prod',
  candidate_model_id: 'nova-v0.6',
  traffic_percentage: 10,
});
// Record metrics...
lifecycle.completeABTest(ab.test_id, 'PROMOTE', 'reviewer-1');
```

## Inference Endpoints

Register OpenAI-compatible endpoints for deployed models:

```typescript
const ep = lifecycle.registerEndpoint({
  model_id: 'nova-v0.6',
  engine: 'vllm',
  openai_compatible: true,
  max_concurrent_requests: 32,
});
lifecycle.setEndpointStatus(ep.endpoint_id, 'DEPLOYED');
```
