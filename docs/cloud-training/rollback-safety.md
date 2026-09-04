# Rollback & Safety

## Rollback Mechanism

Rollback restores a previously production-deployed model from a DEPRECATED
state.  The operation is atomic:

1. Current PRODUCTION model is deprecated
2. Target model is set to PRODUCTION
3. A `RollbackEvent` is recorded

```typescript
const event = lifecycle.rollbackTo(
  foundationModelId,
  'Regression detected in security evaluation',
  'reviewer-1',
);
```

## Rollback Requirements

- A model must currently be in PRODUCTION status
- The target must be in DEPRECATED or PRODUCTION status
- The target must exist in the model registry

## Rollback History

```typescript
const history = lifecycle.getRollbackHistory();
// [{ event_id, model_id, target_model_id, reason, triggered_at, triggered_by }]
```

## Safety Checks

### Before Training
- Dataset contamination guard (production markers, raw IDs, PII)
- Quality scoring threshold
- Anonymization verification

### During Training
- Deterministic seeding (fixed seed, bf16, gradient checkpointing)
- Loss curve monitoring (detect divergence early)
- GPU utilisation tracking

### Before Deployment
- 6 promotion gates (provenance, evaluation, regression, improvement, safety, signoff)
- Regression guard on safety-critical categories
- Human reviewer approval

### After Deployment
- A/B testing with traffic splitting
- Inference health checks
- Cost monitoring

## Emergency Procedures

1. **Immediate**: Cancel the running job via the GPU provider
2. **Short-term**: Rollback to the previous PRODUCTION model
3. **Investigation**: Analyze logs via `TrainingObservability`
4. **Recovery**: Re-run from the last clean checkpoint
