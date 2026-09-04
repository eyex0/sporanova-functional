# NOVA Release Process

## Overview

This document covers the end-to-end process for releasing a new NOVA model version, from dataset generation through production deployment and monitoring.

## Version Naming Convention

```
nova-<size>-<method>-v<major>.<minor>-<YYYYMMDD>
```

Examples:

- `nova-7b-qlora-v0.3-20260315`
- `nova-7b-lora-v0.4-20260401`
- `nova-13b-fullft-v1.0-20260501`

| Component | Rules |
|-----------|-------|
| size | Model parameter count: 7b, 13b, 70b |
| method | Training method: qlora, lora, fullft, dpo |
| major | Breaking changes: new base model, schema change |
| minor | Incremental improvements: more data, new categories |
| date | Release date in YYYYMMDD format |

## Release Steps

### Step 1: Generate Dataset

```bash
# Generate synthetic data
python training/generation/generate.py \
  --config training/generation/config.yaml \
  --output training/datasets/raw/

# Build dataset
python training/scripts/build_dataset.py \
  --raw-dir training/datasets/raw/ \
  --output-dir training/datasets/v0.4/ \
  --version v0.4

# Validate
python training/scripts/validate_dataset.py \
  --dataset training/datasets/v0.4/ \
  --checks schema,completeness,balance,contamination
```

**Checkpoint:**

- [ ] Dataset passes all validation checks
- [ ] Contamination rate < 0.5%
- [ ] Language distribution within targets
- [ ] manifest.json is complete

### Step 2: Run Training

```bash
# Configure training
# Edit training/configs/nova-qlora.yaml

# Start training
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --experiment-name nova-7b-qlora-v0.4 \
  --wandb-project nova-releases

# Monitor
tensorboard --logdir training/checkpoints/nova-7b-qlora-v0.4/logs/
```

**Checkpoint:**

- [ ] Training completed without errors
- [ ] Final loss < 1.0
- [ ] No NaN orInf in loss
- [ ] Gradient norms stable (< 1.0)

### Step 3: Run Evaluation

```bash
# Run full evaluation
python evaluation/run_benchmarks.py \
  --model training/checkpoints/nova-7b-qlora-v0.4/best/ \
  --output results/nova-7b-qlora-v0.4/ \
  --categories all

# Check for regressions
python evaluation/check_regressions.py \
  --current results/nova-7b-qlora-v0.4/ \
  --previous results/nova-7b-qlora-v0.3/ \
  --thresholds evaluation/configs/regression_thresholds.json
```

**Checkpoint:**

- [ ] All benchmarks pass (mean score > 55)
- [ ] No regressions > 5 points
- [ ] Safety score > 80
- [ ] No contamination detected

### Step 4: Register Model

```bash
# Register in model registry
python registry/register.py \
  --model training/checkpoints/nova-7b-qlora-v0.4/best/ \
  --results results/nova-7b-qlora-v0.4/ \
  --name nova-7b-qlora-v0.4 \
  --method qlora \
  --dataset v0.4 \
  --base-model Qwen/Qwen2.5-7B

# Verify registration
python registry/show.py nova-7b-qlora-v0.4-20260401
```

**Checkpoint:**

- [ ] Model registered with all metadata
- [ ] Evaluation results attached
- [ ] Training config linked
- [ ] Artifacts stored correctly

### Step 5: Review and Approve

```bash
# Generate review package
python registry/review_package.py \
  --model nova-7b-qlora-v0.4-20260401 \
  --output review/release-v0.4/

# Review includes:
# - Evaluation comparison report
# - Training metrics summary
# - Dataset statistics
# - Safety audit results
```

**Review checklist:**

- [ ] Evaluation results reviewed by team lead
- [ ] Comparison with previous version approved
- [ ] Safety audit passed
- [ ] No critical issues in training logs
- [ ] Dataset quality verified
- [ ] Approval recorded in registry

```bash
# Approve model
python registry/promote.py \
  --model nova-7b-qlora-v0.4-20260401 \
  --stage APPROVED \
  --approved-by montaser@example.com \
  --reason "Passed all evaluations, approved for production"
```

### Step 6: Deploy to Production

```bash
# Merge adapters (for QLoRA/LoRA)
python training/scripts/merge_adapter.py \
  --base-model Qwen/Qwen2.5-7B \
  --adapter training/checkpoints/nova-7b-qlora-v0.4/best/ \
  --output models/nova-7b-qlora-v0.4-merged/

# Deploy
python registry/promote.py \
  --model nova-7b-qlora-v0.4-20260401 \
  --stage PRODUCTION \
  --endpoint https://api.example.com/v1/chat \
  --replicas 2

# Verify deployment
curl https://api.example.com/v1/health
curl https://api.example.com/v1/models
```

**Checkpoint:**

- [ ] Model deployed to production endpoint
- [ ] Health check passing
- [ ] Smoke test completed
- [ ] Previous version available for rollback
- [ ] Load balancer updated

### Step 7: Monitor and Observe

```bash
# Start monitoring dashboard
python monitoring/dashboard.py --port 8082

# Check inference metrics
python monitoring/check_metrics.py \
  --model nova-7b-qlora-v0.4-20260401 \
  --since "2026-04-01T10:00:00Z"
```

**Monitoring targets:**

| Metric | Target | Alert If |
|--------|--------|----------|
| Latency p50 | < 50ms | > 100ms |
| Latency p99 | < 200ms | > 500ms |
| Error rate | < 0.1% | > 1% |
| Throughput | > 10 rps | < 5 rps |
| User satisfaction | > 4.0/5 | < 3.5/5 |

## Rollback Procedures

### Immediate rollback (< 5 minutes)

```bash
# Switch traffic to previous version
python registry/rollback.py \
  --from nova-7b-qlora-v0.4-20260401 \
  --to nova-7b-qlora-v0.3-20260315 \
  --reason "Elevated error rate in v0.4"

# Verify
curl https://api.example.com/v1/health
```

### Full rollback (if needed)

```bash
# 1. Demote failed model
python registry/promote.py \
  --model nova-7b-qlora-v0.4-20260401 \
  --stage DEPRECATED \
  --reason "Production issues, rolling back"

# 2. Promote previous model
python registry/promote.py \
  --model nova-7b-qlora-v0.3-20260315 \
  --stage PRODUCTION

# 3. Redeploy
python deployment/deploy.py \
  --model nova-7b-qlora-v0.3-20260315 \
  --replicas 2

# 4. Notify team
python notifications/send.py \
  --channel alerts \
  --message "Rolled back NOVA v0.4 to v0.3 due to production issues"
```

### Rollback triggers

| Condition | Action | Speed |
|-----------|--------|-------|
| Error rate > 5% | Immediate rollback | < 5 min |
| Latency p99 > 1s | Investigate, rollback if sustained | < 15 min |
| Safety score < 70 | Immediate rollback | < 5 min |
| User complaints spike | Investigate, potential rollback | < 30 min |
| Data quality issue | Immediate rollback | < 5 min |

## Release Checklist Template

```markdown
## Release: nova-7b-qlora-v0.4

### Dataset
- [ ] Dataset generated (v0.4)
- [ ] Validation passed
- [ ] Contamination check passed
- [ ] manifest.json complete

### Training
- [ ] Training completed
- [ ] Final loss: ___
- [ ] Training time: ___ hours
- [ ] No errors in logs

### Evaluation
- [ ] Mean score: ___
- [ ] No regressions detected
- [ ] Safety score: ___
- [ ] All benchmarks pass

### Registry
- [ ] Model registered
- [ ] All metadata attached
- [ ] Artifacts stored

### Review
- [ ] Reviewed by: ___
- [ ] Approved: YES/NO
- [ ] Notes: ___

### Deployment
- [ ] Model merged
- [ ] Deployed to production
- [ ] Health check passing
- [ ] Smoke test passed

### Monitoring
- [ ] Latency acceptable
- [ ] Error rate acceptable
- [ ] Throughput acceptable
- [ ] No user complaints

### Rollback
- [ ] Previous version available
- [ ] Rollback tested
- [ ] Rollback procedure documented
```

## Post-Release

After successful deployment:

1. Update release notes in `docs/releases/`
2. Notify stakeholders
3. Update documentation if API changed
4. Archive training artifacts
5. Clean up temporary files
6. Schedule next release review (1 week)
