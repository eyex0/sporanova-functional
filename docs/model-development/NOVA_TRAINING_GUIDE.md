# NOVA Training Guide

## Overview

NOVA supports multiple training approaches depending on your hardware budget and use case. The standard workflow is: Dataset → Training → Evaluation → Registry.

## Training Approaches

| Method | GPU Required | Training Time | Quality | When to Use |
|--------|-------------|---------------|---------|-------------|
| QLoRA | 1x A100 80GB | 4-8 hours | Good | Quick iteration, limited compute |
| LoRA | 1x A100 80GB | 8-16 hours | Better | Balanced quality and cost |
| Full FT | 4x A100 80GB | 24-48 hours | Best | Maximum quality, production |
| DPO | 1x A100 80GB | 4-8 hours | Best + alignment | Post-training alignment |

## Prerequisites

### Hardware

| Tier | GPU | VRAM | Use Case |
|------|-----|------|----------|
| Development | 1x RTX 4090 | 24GB | Testing, debugging |
| LoRA/QLoRA | 1x A100 | 80GB | Regular training |
| Full FT | 4x A100 | 80GB each | Production training |
| Inference | 2x H100 | 80GB each | Serving models |

### Software

```bash
# Create environment
conda create -n nova python=3.11
conda activate nova

# Install dependencies
pip install -r requirements.txt

# Verify CUDA
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.device_count())"
```

### Required packages

```
torch>=2.2.0
transformers>=4.38.0
peft>=0.9.0
bitsandbytes>=0.43.0
datasets>=2.18.0
trl>=0.7.0
accelerate>=0.27.0
wandb>=0.16.0
tensorboard>=2.16.0
```

## Step-by-Step Workflow

### Step 1: Prepare Dataset

```bash
# Generate dataset (if not already done)
python training/generation/generate.py \
  --config training/generation/config.yaml \
  --output training/datasets/raw/

# Build and validate
python training/scripts/build_dataset.py \
  --raw-dir training/datasets/raw/ \
  --output-dir training/datasets/v0.3/ \
  --version v0.3

python training/scripts/validate_dataset.py \
  --dataset training/datasets/v0.3/
```

### Step 2: Configure Training

Edit the training config for your method:

```yaml
# training/configs/nova-qlora.yaml
method: qlora

model:
  base: "Qwen/Qwen2.5-7B"
  max_length: 4096

training:
  epochs: 3
  batch_size: 4
  gradient_accumulation: 8
  learning_rate: 2e-4
  lr_scheduler: cosine
  warmup_ratio: 0.1
  weight_decay: 0.01
  fp16: false
  bf16: true

qlora:
  r: 64
  lora_alpha: 128
  lora_dropout: 0.05
  target_modules:
    - q_proj
    - k_proj
    - v_proj
    - o_proj
    - gate_proj
    - up_proj
    - down_proj
  quantization:
    bits: 4
    type: nf4
    double_quant: true

dataset:
  path: "training/datasets/v0.3/"
  format: "chatml"

output:
  dir: "training/checkpoints/nova-7b-qlora-v0.3/"
  save_strategy: "steps"
  save_steps: 500
  eval_strategy: "steps"
  eval_steps: 500
  logging_steps: 10
```

### Step 3: Start Training

```bash
# QLoRA training
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --experiment-name nova-7b-qlora-v0.3

# LoRA training
python training/train.py \
  --config training/configs/nova-lora.yaml \
  --experiment-name nova-7b-lora-v0.3

# Full fine-tuning
python training/train.py \
  --config training/configs/nova-fullft.yaml \
  --experiment-name nova-7b-fullft-v0.3
```

### Step 4: Evaluate

```bash
python evaluation/run_benchmarks.py \
  --model training/checkpoints/nova-7b-qlora-v0.3/final/ \
  --output results/nova-7b-qlora-v0.3/ \
  --categories all
```

### Step 5: Register

```bash
python registry/register.py \
  --model training/checkpoints/nova-7b-qlora-v0.3/final/ \
  --results results/nova-7b-qlora-v0.3/ \
  --name nova-7b-qlora-v0.3 \
  --method qlora \
  --dataset v0.3
```

## Choosing a Training Method

### Decision tree

```
Need production quality?
├── Yes → Do you have 4x A100?
│   ├── Yes → Full FT
│   └── No → LoRA on cloud
└── No → Iterating quickly?
    ├── Yes → QLoRA on single GPU
    └── No → LoRA
```

### QLoRA vs LoRA vs Full FT

| Factor | QLoRA | LoRA | Full FT |
|--------|-------|------|---------|
| Memory | 20-30 GB | 40-60 GB | 120-160 GB |
| Speed | Fast | Medium | Slow |
| Quality | Good | Better | Best |
| Overhead | Quantization noise | Low-rank approx | None |
| Best for | Prototyping | Balanced | Production |

### When to use DPO

Use DPO after SFT to align the model with human preferences:

```bash
# Step 1: Train with SFT (QLoRA/LoRA/Full FT)
python training/train.py --config training/configs/nova-qlora.yaml

# Step 2: Align with DPO
python training/train.py --config training/configs/nova-dpo.yaml \
  --base-model training/checkpoints/nova-7b-qlora-v0.3/final/
```

DPO config:

```yaml
# training/configs/nova-dpo.yaml
method: dpo
model:
  base: "training/checkpoints/nova-7b-qlora-v0.3/final/"

dpo:
  beta: 0.1
  loss_type: sigmoid
  label_smoothing: 0.0

dataset:
  path: "training/datasets/dpo_pairs_v0.3/"
  format: "chatml"
```

## Monitoring Training

### Weights & Biases

```bash
# Login
wandb login

# Training auto-logs to wandb when enabled
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --wandb-project nova-training \
  --wandb-run-name nova-7b-qlora-v0.3
```

### TensorBoard

```bash
tensorboard --logdir training/checkpoints/nova-7b-qlora-v0.3/logs/
```

### Key metrics to watch

| Metric | Healthy Range | Alert If |
|--------|--------------|----------|
| train/loss | Decreasing steadily | Plateaus early or spikes |
| eval/loss | Close to train/loss | Diverges from train/loss |
| learning_rate | Follows schedule | Stays flat or explodes |
| grad_norm | < 1.0 | > 5.0 indicates instability |
| eval/gsm8k | Increasing | Drops from previous checkpoint |

### Early stopping

The trainer stops automatically if:

1. eval loss does not improve for `patience` consecutive evaluations
2. grad_norm exceeds 10.0 (training instability)
3. loss becomes NaN or Inf

## Checkpoint Management

```bash
# List checkpoints
ls training/checkpoints/nova-7b-qlora-v0.3/

# Select best checkpoint (by eval loss)
python training/scripts/select_best.py \
  --checkpoint-dir training/checkpoints/nova-7b-qlora-v0.3/ \
  --metric eval_loss \
  --output training/checkpoints/nova-7b-qlora-v0.3/final/
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CUDA OOM | Reduce batch_size or increase gradient_accumulation |
| Loss NaN | Lower learning rate, check data for corruption |
| Slow training | Enable bf16, increase batch_size if memory allows |
| Poor eval scores | Check dataset quality, increase training epochs |
| wandb not logging | Run `wandb login` and check `--wandb-project` flag |
