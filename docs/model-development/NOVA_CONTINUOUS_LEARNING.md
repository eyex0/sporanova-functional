# NOVA Continuous Learning

## Overview

NOVA uses a controlled continuous learning pipeline to improve models from production usage data without training on raw user conversations. Every piece of data passes through privacy filtering, quality checks, and human review before entering the training pipeline.

## Why Not Train on Raw Conversations?

| Risk | Consequence |
|------|-------------|
| PII leakage | User names, emails, addresses in model weights |
| Toxic content | Model learns harmful patterns |
| Privacy violations | GDPR/CCPA non-compliance |
| Data contamination | Evaluation benchmark leakage |
| Distribution shift | Model degrades on core capabilities |

The pipeline below mitigates all these risks.

## Pipeline Overview

```
Production Traffic
       │
       ▼
┌──────────────┐
│ Log Capture   │  Anonymized interaction logs (no PII)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Privacy Filter│  Remove/redact PII, sensitive data
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Quality Gate  │  Filter low-quality, toxic, or irrelevant samples
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Human Review  │  Expert review and annotation
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Dataset Add   │  Add approved samples to training dataset
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Training      │  Retrain with expanded dataset
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Evaluation    │  Validate no regressions
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Deployment    │  Replace production model
└──────────────┘
```

## Step 1: Log Capture

Production logs are captured with minimal PII from the start:

```python
# In production inference code
import hashlib
import uuid

def anonymize_log(user_id, conversation):
    return {
        "session_id": str(uuid.uuid4()),
        "user_hash": hashlib.sha256(user_id.encode()).hexdigest()[:16],
        "timestamp": conversation.timestamp,
        "messages": [
            {"role": m.role, "content": m.content}
            for m in conversation.messages
        ],
        "metadata": {
            "model_version": conversation.model_version,
            "response_time_ms": conversation.response_time_ms,
            "user_rating": conversation.user_rating
        }
    }
```

### Log retention

| Data | Retention | Storage |
|------|-----------|---------|
| Raw logs | 30 days | Encrypted, access-controlled |
| Anonymized logs | 90 days | Staging area |
| Training samples | Permanent | Dataset directory |

## Step 2: Privacy Filter

Automated PII detection and removal:

```bash
python training/pipeline/privacy_filter.py \
  --input logs/anonymized/ \
  --output logs/filtered/ \
  --config training/pipeline/privacy_config.yaml \
  --report reports/privacy_scan_$(date +%Y%m%d).json
```

### Privacy config

```yaml
# training/pipeline/privacy_config.yaml
pii_detection:
  enabled: true
  models:
    - presidio          # Microsoft Presidio
    - regex_patterns    # Custom regex rules

redaction:
  strategy: "replace"   # replace | mask | remove
  replacement_tokens:
    name: "[PERSON]"
    email: "[EMAIL]"
    phone: "[PHONE]"
    address: "[ADDRESS]"
    ssn: "[SSN]"
    credit_card: "[CREDIT_CARD]"
    ip_address: "[IP]"

sensitivity:
  high_pii_action: "remove_sample"   # Drop entire sample
  medium_pii_action: "redact"        # Replace with token
  low_pii_action: "redact"           # Replace with token

allowed_patterns:
  - "model_version"      # Keep model version strings
  - "timestamp"          # Keep timestamps
  - "generic_numbers"    # Keep non-identifying numbers
```

### Privacy scan report

```json
{
  "scan_date": "2026-03-15",
  "total_samples": 15000,
  "pii_detected": 234,
  "breakdown": {
    "email": 45,
    "phone": 32,
    "name": 89,
    "address": 28,
    "other": 40
  },
  "high_sensitivity_removed": 12,
  "medium_sensitivity_redacted": 180,
  "clean_samples": 14766
}
```

## Step 3: Quality Gate

Filter samples that are toxic, irrelevant, or low quality:

```bash
python training/pipeline/quality_gate.py \
  --input logs/filtered/ \
  --output logs/quality_approved/ \
  --config training/pipeline/quality_config.yaml
```

### Quality filters

| Filter | Threshold | Action |
|--------|-----------|--------|
| Toxicity score | > 0.7 | Remove |
| Relevance score | < 0.5 | Remove |
| Language detection | Not in target languages | Remove |
| Length | < 50 tokens or > 4096 tokens | Remove |
| Duplicate | > 90% similarity to existing | Remove |
| Instruction quality | < 0.6 | Remove |

### Quality config

```yaml
# training/pipeline/quality_config.yaml
filters:
  toxicity:
    enabled: true
    threshold: 0.7
    model: "unitary/toxic-bert"
  
  relevance:
    enabled: true
    threshold: 0.5
    reference: "core_use_cases.json"
  
  language:
    enabled: true
    allowed: ["en", "ar", "fr", "de", "es"]
    model: "papluca/xlm-roberta-base-language-detection"
  
  length:
    min_tokens: 50
    max_tokens: 4096
  
  dedup:
    method: "minhash"
    threshold: 0.90
  
  instruction_quality:
    enabled: true
    threshold: 0.6
    scorer: "quality_scorer_v1"
```

## Step 4: Human Review

Approved samples are queued for expert review:

```bash
# Generate review queue
python training/pipeline/review_queue.py \
  --input logs/quality_approved/ \
  --output review/queue/ \
  --batch-size 100

# Start review UI
python training/pipeline/review_ui.py \
  --port 8080
```

### Review process

1. Reviewer sees sample pairs (instruction + response)
2. Rate quality: 1 (poor) to 5 (excellent)
3. Flag issues: toxic, inaccurate, off-topic, PII leak
4. Approve or reject

### Review criteria

| Rating | Criteria | Action |
|--------|----------|--------|
| 5 | Excellent quality, accurate, helpful | Approve |
| 4 | Good quality, minor issues | Approve with edit |
| 3 | Acceptable, some concerns | Approve with flag |
| 2 | Poor quality, significant issues | Reject |
| 1 | Toxic, harmful, or completely off-topic | Reject, report |

### Review statistics

```json
{
  "review_period": "2026-03-01 to 2026-03-15",
  "total_reviewed": 1500,
  "approved": 1125,
  "rejected": 375,
  "approval_rate": 0.75,
  "avg_rating": 3.8,
  "reviewers": 3,
  "avg_time_per_sample_seconds": 15
}
```

## Step 5: Dataset Addition

Approved samples are formatted and added to the training dataset:

```bash
python training/pipeline/add_to_dataset.py \
  --approved review/approved/ \
  --dataset training/datasets/v0.3/ \
  --output training/datasets/v0.4/ \
  --version v0.4 \
  --validate
```

### Validation checks

Before adding to dataset:

1. Schema compatibility with existing data
2. No contamination with evaluation benchmarks
3. Language distribution within targets
4. Category balance maintained
5. Quality score above threshold

## Safety Controls

### Automated safety

| Control | Description |
|---------|-------------|
| PII scanning | Every sample scanned before training |
| Toxicity filtering | Toxic content removed automatically |
| Contamination check | No overlap with eval benchmarks |
| Distribution monitoring | Category/language balance alerts |
| Regressions check | Eval benchmarks must not degrade |

### Manual safety

| Control | Description |
|---------|-------------|
| Human review | Expert review of all production samples |
| Approval gate | Manual approval before dataset addition |
| Audit trail | Full logging of all pipeline decisions |
| Emergency stop | Can halt pipeline at any stage |

### Safety thresholds

```yaml
# training/pipeline/safety_config.yaml
safety:
  max_contamination_rate: 0.005
  min_safety_score: 70
  max_toxicity_rate: 0.01
  min_quality_score: 0.6
  
  alert:
    toxicity_spike: 0.05       # Alert if toxicity > 5% in batch
    quality_drop: 0.1          # Alert if quality drops > 10%
    pii_leak: 0               # Zero tolerance for PII in training data
```

### Emergency procedures

```bash
# Halt pipeline
python training/pipeline/emergency_stop.py --reason "PII leak detected"

# Rollback dataset
python training/pipeline/rollback_dataset.py \
  --from v0.4 \
  --to v0.3 \
  --reason "Quality regression in v0.4"

# Audit recent additions
python training/pipeline/audit.py \
  --since 2026-03-01 \
  --output reports/audit_20260301.json
```

## Monitoring the Pipeline

```bash
# Dashboard
python training/pipeline/dashboard.py --port 8081

# Pipeline health check
python training/pipeline/health_check.py

# Weekly report
python training/pipeline/weekly_report.py \
  --week 2026-W11 \
  --output reports/weekly_2026_W11.json
```

### Key metrics

| Metric | Target | Alert If |
|--------|--------|----------|
| Pipeline throughput | > 1000 samples/day | < 500 samples/day |
| Privacy filter pass rate | > 98% | < 95% |
| Quality gate pass rate | > 70% | < 60% |
| Human approval rate | > 70% | < 50% |
| Time to dataset | < 7 days | > 14 days |
| PII leak rate | 0% | > 0% |
