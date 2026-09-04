# NOVA First GPU Training Run — Operator Runbook

**Version**: v0.5.1
**Base Model**: Qwen/Qwen2.5-72B-Instruct (Apache 2.0)
**Method**: QLoRA (4-bit NF4, LoRA r=64/alpha=128)
**Dataset**: nova-ds-v0.5.1 (35,020 examples)
**Date**: 2026-09-04

> This runbook is for a HUMAN OPERATOR. Do not automate beyond what is described.

---

## 1. Select GPU Provider

Recommended: **RunPod** with A100-80GB.

| Provider | GPU | USD/hr | 24hr Cost |
|----------|-----|--------|-----------|
| RunPod | A100-80GB | ~$1.99 | ~$48 |
| AWS p4d.24xlarge | 8x A100-40GB | ~$32.77 | ~$787 |
| Lambda | A100-80GB | ~$1.29 | ~$31 |

Minimum: 1x A100-80GB. The 72B model in 4-bit quantization fits in 80GB with gradient checkpointing.

## 2. Provision Instance

```bash
# Example: RunPod template (adjust to actual RunPod API/UI)
# Container: runpod/pytorch:2.4.0-py3.11-cuda12.4.0-devel
# Volume: 100GB (dataset + checkpoints)
# Expose: 22 (SSH)
```

Verify GPU is available:

```bash
nvidia-smi
nvcc --version  # CUDA >= 12.1
python3 -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## 3. Clone Repository

```bash
git clone https://github.com/SOPRANOVA/sporanova-functional.git
cd sporanova-functional
git checkout 47cd516  # or the audited commit
```

## 4. Install Dependencies

```bash
pip install -r training/requirements.txt

# Verify critical packages
python3 -c "import torch; import transformers; import peft; import bitsandbytes; import trl; print('All training packages OK')"
```

Required versions (from training/requirements.txt):

- torch >= 2.4.0
- transformers >= 4.46.0
- peft >= 0.14.0
- trl >= 0.12.0
- datasets >= 3.2.0
- accelerate >= 1.2.0
- bitsandbytes >= 0.45.0
- pyyaml (for config parsing)

## 5. Authenticate with Model Registry (if required)

```bash
# For HuggingFace gated models (Qwen2.5-72B-Instruct is NOT gated, but may require login for rate limits)
huggingface-cli login --token $HF_TOKEN
```

No SOPRANOVA-specific registry authentication is needed. The dataset is self-contained.

## 6. Download / Load Base Model Manually

```bash
# The operator manually downloads Qwen2.5-72B-Instruct
# This is NOT automated by the codebase.

# Option A: via huggingface_hub
python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen2.5-72B-Instruct', local_dir='./models/Qwen2.5-72B-Instruct')"

# Option B: via git-lfs
# git lfs install
# git clone https://huggingface.co/Qwen/Qwen2.5-72B-Instruct ./models/Qwen2.5-72B-Instruct

# Verify model files
ls -la ./models/Qwen2.5-72B-Instruct/
# Expected: config.json, tokenizer files, *.safetensors (or .bin)
```

> WARNING: The 72B model is ~140GB in fp16/bf16. With 4-bit quantization, only ~36GB is needed on GPU, but the full download is still required.

## 7. Upload Dataset

Option A — if the dataset was generated locally and needs to be uploaded:

```bash
# From your local machine, upload to the GPU host
scp -i ~/.ssh/key.pem training/datasets/v0.5/*.jsonl training/datasets/v0.5/*.json root@GPU_HOST:/workspace/sporanova-functional/training/datasets/v0.5/
```

Option B — regenerate on the GPU host:

```bash
npx tsx training/scripts/generate_v05_dataset.ts
# Seed: 20260904 (deterministic, same dataset)
```

## 8. Verify Dataset SHA-256

```bash
# Compute content hash of the training data
python3 -c "
import hashlib, json
examples = []
for fname in ['training/datasets/v0.5/train.jsonl', 'training/datasets/v0.5/validation.jsonl', 'training/datasets/v0.5/test.jsonl']:
    with open(fname) as f:
        for line in f:
            examples.append(json.loads(line))
examples.sort(key=lambda e: e['id'])
h = hashlib.sha256('\n'.join(json.dumps(e, sort_keys=True) for e in examples).encode()).hexdigest()
print(f'Content SHA-256: {h}')
print(f'Total: {len(examples)} examples')
"

# Expected: 8087015c0478f00186ec8dd7ad226085e7cc9623a64b9b80739a8d1bc3b89744
# Compare with provenance.json: training/datasets/v0.5/provenance.json

cat training/datasets/v0.5/provenance.json
cat training/datasets/v0.5/quality-gates.json | python3 -m json.tool
```

If hashes do not match, DO NOT proceed. Re-download or regenerate the dataset.

## 9. Run Environment Validation

```bash
# Validate the training environment
python3 -c "
import torch
print(f'PyTorch: {torch.__version__}')
print(f'CUDA: {torch.version.cuda}')
print(f'GPU: {torch.cuda.get_device_name(0)}')
print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
print(f'bf16 supported: {torch.cuda.is_bf16_supported()}')
"

# Validate dataset can be loaded
python3 -c "
from datasets import load_dataset
ds = load_dataset('json', data_files='training/datasets/v0.5/train.jsonl', split='train')
print(f'Train examples: {len(ds)}')
print(f'First example keys: {list(ds[0].keys())}')
"
```

## 10. Run a Tiny Smoke-Test Training Job

Before the real run, verify the pipeline works with a 100-example subset:

```bash
# Create a tiny subset
python3 -c "
import json
with open('training/datasets/v0.5/train.jsonl') as f:
    lines = f.readlines()
with open('/tmp/smoke-train.jsonl', 'w') as f:
    f.writelines(lines[:100])
with open('training/datasets/v0.5/validation.jsonl') as f:
    lines = f.readlines()
with open('/tmp/smoke-val.jsonl', 'w') as f:
    f.writelines(lines[:10])
print('Smoke dataset: 100 train, 10 val')
"

# Create smoke config (single epoch, tiny batch)
cat > /tmp/smoke-config.yaml << 'EOF'
base_model: Qwen/Qwen2.5-72B-Instruct
method: qlora
system_prompt: You are NOVA, the primary intelligence layer powering SOPRANOVA agents.
lora:
  rank: 64
  alpha: 128
  dropout: 0.05
  target_modules: [q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj]
training:
  batch_size: 1
  gradient_accumulation: 1
  epochs: 1
  learning_rate: 0.0002
  lr_scheduler_type: cosine
  warmup_steps: 5
  weight_decay: 0.01
  max_grad_norm: 1.0
  bf16: true
  fp16: false
  gradient_checkpointing: true
  optim: paged_adamw_8bit
  logging_steps: 1
  save_steps: 50
  eval_steps: 50
  save_total_limit: 1
  max_seq_length: 2048
EOF

python3 training/cloud/qlora/train.py \
  --job-id smoke-test-001 \
  --config /tmp/smoke-config.yaml \
  --dataset-dir /tmp \
  --output-dir /tmp/smoke-output \
  --seed 20260904
```

Expected smoke test duration: 2-5 minutes. If it fails, debug before the real run.

## 11. Verify GPU Utilization

During the smoke test, monitor in another terminal:

```bash
watch -n 1 nvidia-smi
# Expected: GPU utilization 80-100%, VRAM ~40-60GB

# Check memory
python3 -c "import torch; print(f'Allocated: {torch.cuda.memory_allocated() / 1e9:.1f}GB, Reserved: {torch.cuda.memory_reserved() / 1e9:.1f}GB')"
```

## 12. Run the Real QLoRA Job

```bash
# Real training on the full dataset
# Config: training/configs/nova-qlora.yaml
# Duration: ~4-8 hours on A100-80GB
# Cost: ~$8-16 on RunPod A100-80GB

python3 training/cloud/qlora/train.py \
  --job-id nova-job-qlora-v0.5.1-$(date +%s) \
  --config training/configs/nova-qlora.yaml \
  --dataset-dir training/datasets/v0.5 \
  --output-dir ./checkpoints \
  --seed 20260904

# Training configuration (from nova-qlora.yaml):
#   batch_size=4, gradient_accumulation=8, effective_batch=32
#   epochs=3, learning_rate=2e-4, warmup_steps=100
#   bf16=true, gradient_checkpointing=true
#   save_steps=200, eval_steps=100, save_total_limit=3
#   max_seq_length=8192, chat_template=qwen2.5
```

Monitor training logs for:

- Train loss decreasing
- Eval loss decreasing (with periodic evaluation)
- No OOM errors
- GPU utilization sustained

## 13. Save Checkpoints

The script saves to: `./checkpoints/nova-job-qlora-v0.5.1-*/`

```bash
# Verify checkpoint
ls -la ./checkpoints/nova-job-qlora-v0.5.1-*/
# Expected: adapter_model.safetensors, adapter_config.json, tokenizer*, metrics.json

cat ./checkpoints/nova-job-qlora-v0.5.1-*/metrics.json
```

## 14. Validate Checkpoint

```bash
npx tsx -e "
import { NovaCheckpointValidator } from './training/registry/checkpoint_validator.js';
const v = new NovaCheckpointValidator();
const result = v.validate('./checkpoints/nova-job-qlora-v0.5.1-*/');
console.log(JSON.stringify(result, null, 2));
"

# Expected: valid=true, no errors
# The validator checks: adapter files, tokenizer, config, no data leakage, SHA-256
```

## 15. Run Real Evaluation

```bash
# Evaluate the checkpoint against Qwen2.5-72B-Instruct baseline
# This requires a separate evaluation script on the GPU host

python3 training/cloud/qlora/evaluate.py \
  --base-model Qwen/Qwen2.5-72B-Instruct \
  --candidate ./checkpoints/nova-job-qlora-v0.5.1-*/adapter_model.safetensors \
  --categories all \
  --output ./evaluations/nova-v0.5.1/results.json
```

Alternatively, use the TypeScript harness:

```typescript
import { NovaEvalHarness } from './training/evaluation/eval_harness';
import { RealEvaluationHarness } from './training/cloud/evaluation/real_evaluation';

const harness = new NovaEvalHarness();
const spec = harness.prepareEvaluation({
  checkpointPath: './checkpoints/nova-job-qlora-v0.5.1-*/',
  baseModel: 'Qwen/Qwen2.5-72B-Instruct',
  categories: ['agent_reasoning', 'tool_calling', 'arabic', 'coding', 'safety'],
});
```

## 16. Compare BASE vs NOVA Candidate

```typescript
import { RealEvaluationHarness } from './training/cloud/evaluation/real_evaluation';

const harness = new RealEvaluationHarness();
const comparison = harness.compare({
  base_result: baseEvalResult,
  candidate_result: candidateEvalResult,
  candidate_version: 'v0.5.1',
  candidate_checkpoint_id: 'nova-cp-v0.5.1-001',
});
console.log(`Winner: ${comparison.overall.winner}`);
console.log(`Improvements: ${comparison.improvement_categories.join(', ')}`);
console.log(`Regressions: ${comparison.regression_categories.join(', ')}`);
```

## 17. Human Review

A human reviewer MUST:

1. Inspect the evaluation comparison (no regressions in safety/security)
2. Review a sample of generated outputs
3. Check Arabic quality
4. Verify tool-calling correctness
5. Sign off with their reviewer ID

No automated promotion exists. This step cannot be skipped.

## 18. Register Candidate

```typescript
import { NovaModelLifecycle } from './training/cloud/lifecycle';
import { NovaTrainingOrchestrator, buildCheckpointProvenance } from './training/cloud/jobs/orchestrator';

const lifecycle = new NovaModelLifecycle();
const record = lifecycle.registerFromJob(job, checkpoint);
lifecycle.moveToEvaluation(record.model_id);
// After evaluation + human review:
lifecycle.approve({
  comparison,
  checkpoint,
  safety_approved: true,
  regression_approved: regressionCount === 0,
  reviewer_id: 'human-reviewer-id',
});
// Status: APPROVED (NOT PRODUCTION)
```

## 19. DO NOT Auto-Promote

The model is now in APPROVED status. Promotion to PRODUCTION requires:

```typescript
// Only after ALL gates pass and human approval:
lifecycle.moveToProduction(record.model_id);  // Manual, explicit
```

This step should only be executed after:

- All 6 promotion gates pass
- Safety signoff is on file
- Regression guard is satisfied (or approved)
- Overall improvement confirmed

## 20. Only Manually Promote After All Gates Pass

```typescript
// Final promotion — requires no other model in PRODUCTION
// If a foundation model was in PRODUCTION, deprecate it first:
lifecycle.deprecate(foundationModelId, 'Replaced by NOVA v0.5.1');
lifecycle.moveToProduction(record.model_id);
// Status: PRODUCTION
```

Verify:

```bash
# Check model registry
cat training/datasets/mirror/registry.json | python3 -m json.tool
```

---

## Expected Costs

| Phase | Duration | Cost (RunPod A100-80GB @ $1.99/hr) |
|-------|----------|-------------------------------------|
| Smoke test | 2-5 min | ~$0.15 |
| Full QLoRA (3 epochs) | 4-8 hours | ~$8-16 |
| Evaluation | 30-60 min | ~$1-2 |
| **Total** | **5-9 hours** | **~$10-18** |

## Expected VRAM

| Component | VRAM |
|-----------|------|
| Base model (4-bit) | ~36GB |
| LoRA adapter (r=64) | ~1GB |
| Optimizer (8-bit) | ~4GB |
| Activations (checkpointed) | ~10GB |
| **Total** | **~51GB** (fits in 80GB) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OOM | Reduce batch_size to 2, increase gradient_accumulation |
| Slow training | Verify bf16 is enabled, check GPU utilization |
| Config not loading | Ensure pyyaml is installed (pip install pyyaml) |
| ChatML not applied | Verify transformers >= 4.46.0 |
| Dataset hash mismatch | Re-download or regenerate dataset |
