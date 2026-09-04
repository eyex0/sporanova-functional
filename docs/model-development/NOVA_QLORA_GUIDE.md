# NOVA QLoRA Guide

## What is QLoRA

QLoRA (Quantized Low-Rank Adaptation) fine-tunes a pre-trained model by:

1. Quantizing the base model to 4-bit precision (NF4)
2. Freezing the quantized weights
3. Training only small adapter layers (LoRA) in the original precision

This reduces memory from ~60GB (full LoRA) to ~20GB while retaining most quality.

## When to Use QLoRA

| Use QLoRA when... | Avoid QLoRA when... |
|-------------------|---------------------|
| Single GPU available (24-80GB) | Maximum quality is required |
| Quick iteration needed | Producing final production model |
| Prototyping new dataset | You have 4x A100 available |
| Budget constraints | Quantization artifacts are unacceptable |

## Configuration Walkthrough

```yaml
# training/configs/nova-qlora.yaml

method: qlora

model:
  base: "Qwen/Qwen2.5-7B"     # Base model to adapt
  max_length: 4096              # Maximum sequence length
  trust_remote_code: true       # Required for some models

training:
  epochs: 3                     # Total training epochs
  batch_size: 4                 # Per-GPU batch size
  gradient_accumulation: 8      # Effective batch = 4 * 8 = 32
  learning_rate: 2e-4           # Peak learning rate
  lr_scheduler: cosine          # Schedule type
  warmup_ratio: 0.1             # 10% warmup steps
  weight_decay: 0.01            # L2 regularization
  max_grad_norm: 1.0            # Gradient clipping
  fp16: false                   # Disable FP16
  bf16: true                    # Enable BF16 (preferred)
  seed: 42                      # Reproducibility

qlora:
  r: 64                         # LoRA rank (higher = more capacity)
  lora_alpha: 128               # Scaling factor (usually 2 * r)
  lora_dropout: 0.05            # Dropout on adapter layers
  target_modules:               # Which layers to adapt
    - q_proj
    - k_proj
    - v_proj
    - o_proj
    - gate_proj
    - up_proj
    - down_proj
  quantization:
    bits: 4                     # Quantization bits (4 for QLoRA)
    type: nf4                   # NormalFloat4 quantization
    double_quant: true          # Double quantization for smaller footprint
    compute_dtype: bf16         # Compute dtype for quantized ops

dataset:
  path: "training/datasets/v0.3/"
  format: "chatml"
  split:
    train: 0.95
    val: 0.05

output:
  dir: "training/checkpoints/nova-7b-qlora-v0.3/"
  save_strategy: "steps"
  save_steps: 500
  save_total_limit: 3           # Keep only last 3 checkpoints
  eval_strategy: "steps"
  eval_steps: 500
  logging_steps: 10
  load_best_model_at_end: true
  metric_for_best_model: eval_loss
```

### Key parameters explained

**LoRA rank (`r`)**: Controls adapter capacity. Higher rank = more parameters but more memory.

| Rank | Parameters | VRAM | Quality |
|------|-----------|------|---------|
| 16 | ~10M | ~18 GB | Baseline |
| 32 | ~20M | ~20 GB | Better |
| 64 | ~40M | ~22 GB | Best for QLoRA |
| 128 | ~80M | ~26 GB | Diminishing returns |

**LoRA alpha**: Scaling factor. Standard practice is `alpha = 2 * r`. The effective learning rate for adapters is `lr * alpha / r`.

**Target modules**: Adapting attention + MLP layers gives best results. Adapting only attention (`q_proj`, `v_proj`) uses less memory but reduces quality.

## Running QLoRA Training

### Prerequisites

```bash
# Verify GPU
nvidia-smi

# Check available VRAM
python -c "import torch; print(f'VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB')"
```

### Start training

```bash
# Basic run
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --experiment-name nova-7b-qlora-v0.3

# With wandb logging
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --experiment-name nova-7b-qlora-v0.3 \
  --wandb-project nova-training

# Resume from checkpoint
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --resume training/checkpoints/nova-7b-qlora-v0.3/checkpoint-1500/
```

### Monitor progress

```bash
# TensorBoard
tensorboard --logdir training/checkpoints/nova-7b-qlora-v0.3/logs/

# Check GPU utilization
watch -n 1 nvidia-smi
```

## GPU Requirements

| GPU | VRAM | Batch Size | Effective Batch | Training Time |
|-----|------|-----------|-----------------|---------------|
| RTX 4090 | 24 GB | 2 | 16 | ~16 hours |
| A100 40GB | 40 GB | 4 | 32 | ~8 hours |
| A100 80GB | 80 GB | 8 | 64 | ~4 hours |
| H100 80GB | 80 GB | 8 | 64 | ~3 hours |

All estimates assume 285k samples, 3 epochs, 7B base model.

## Expected Training Time

For a 7B model with QLoRA (rank 64) on 285k samples:

| Phase | A100 80GB | RTX 4090 |
|-------|-----------|----------|
| Setup + data loading | 5 min | 10 min |
| Epoch 1 | 2.5 hours | 5 hours |
| Epoch 2 | 2.5 hours | 5 hours |
| Epoch 3 | 2.5 hours | 5 hours |
| Checkpoint saving | 10 min | 15 min |
| **Total** | **~8 hours** | **~16 hours** |

## Evaluating QLoRA Checkpoints

```bash
# Evaluate each checkpoint
for ckpt in training/checkpoints/nova-7b-qlora-v0.3/checkpoint-*/; do
  echo "Evaluating $ckpt"
  python evaluation/run_benchmarks.py \
    --model "$ckpt" \
    --output "results/qlora/$(basename $ckpt)/" \
    --categories math,code,reasoning
done

# Compare checkpoints
python evaluation/compare_models.py \
  --models results/qlora/checkpoint-500/ \
               results/qlora/checkpoint-1000/ \
               results/qlora/checkpoint-1500/ \
  --output results/qlora/checkpoint_comparison.json
```

### Merge adapters for evaluation

QLoRA checkpoints contain only the adapter weights. Merge before serving:

```bash
python training/scripts/merge_adapter.py \
  --base-model Qwen/Qwen2.5-7B \
  --adapter training/checkpoints/nova-7b-qlora-v0.3/best/ \
  --output models/nova-7b-qlora-v0.3-merged/ \
  --push-to-hub  # optional
```

## Troubleshooting

### CUDA OOM with QLoRA

```bash
# Reduce batch size
# In nova-qlora.yaml, change:
batch_size: 2          # was 4
gradient_accumulation: 16  # was 8 (keeps effective batch = 32)

# Or reduce max_length
max_length: 2048       # was 4096
```

### Slow training

```bash
# Check if BF16 is enabled
python -c "import torch; print(torch.cuda.is_bf16_supported())"

# Enable TF32 for A100/H100
export NVIDIA_TF32_OVERRIDE=1
```

### Poor quality with QLoRA

- Increase rank: `r: 64` → `r: 128`
- Add more target modules
- Increase epochs: `epochs: 3` → `epochs: 5`
- Switch to LoRA (no quantization) if VRAM allows
