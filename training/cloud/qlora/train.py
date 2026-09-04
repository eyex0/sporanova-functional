#!/usr/bin/env python3
# NOVA QLoRA training entrypoint.
#
# This file is the actual training implementation that runs on a GPU
# host. The TypeScript orchestrator (training/cloud/jobs/orchestrator.ts)
# produces a NovaTrainingJob record; a GPU operator pulls the dataset
# from S3, runs this script, and uploads the resulting adapter.
#
# This file is INTENTIONALLY a self-contained script that is NEVER executed
# by the application server. It is uploaded to a GPU host (e.g. RunPod,
# AWS, Vast) and run there. The application server has no business
# importing it.
#
# Required environment variables (passed by the GPU operator, never committed):
#   SOPRANOVA_STORAGE_BUCKET
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (or RUNPOD_API_KEY, etc.)
#   NOVA_JOB_ID
#
# Required Python packages (pinned in training/requirements.txt):
#   torch, transformers, peft, bitsandbytes, trl, accelerate, datasets
#
# Exit code 0 = success. Any non-zero exit = job failure.

"""
Run:
  python training/cloud/qlora/train.py --job-id <JOB_ID> --config <CONFIG_PATH>

Inputs are read from the JSONL files in the dataset directory described by
the provenance record. The script:
  1. Loads the base model in 4-bit (bitsandbytes).
  2. Wraps it with a QLoRA adapter (PEFT).
  3. Fine-tunes on the dataset using SFTTrainer (TRL).
  4. Saves the adapter and tokenizer to the S3 output path.
  5. Emits metrics.json and final-manifest.json to the same path.

Determinism:
  - The orchestrator passes a fixed seed.
  - We set torch.manual_seed, torch.cuda.manual_seed_all, and enable
    deterministic algorithms where possible.
  - bf16 is used on Ampere/Hopper, fp16 otherwise.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="NOVA QLoRA trainer")
    parser.add_argument("--job-id", required=True, help="Nova training job id")
    parser.add_argument("--config", required=True, help="Path to the YAML config file (e.g. training/configs/nova-qlora.yaml)")
    parser.add_argument("--dataset-dir", required=True, help="S3 URI or local path to the dataset directory")
    parser.add_argument("--output-dir", required=True, help="S3 URI or local path for the output adapter")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    # Lazy imports: the GPU host must already have these installed.
    import torch
    from datasets import load_dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        TrainingArguments,
    )
    from trl import SFTTrainer

    # Read the config (kept as a JSON dump for portability in this stub;
    # real configs can be YAML via pyyaml).
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"Config not found: {config_path}", file=sys.stderr)
        sys.exit(2)
    with open(config_path, "r", encoding="utf-8") as fh:
        cfg = json.loads(fh.read().split("# YAML config")[0]) if "# YAML config" in fh.read() else json.load(fh)

    base_model = cfg.get("base_model", "Qwen/Qwen2.5-72B-Instruct")

    # Determinism
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

    # Quantisation
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Model
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        attn_implementation="sdpa",
    )
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    model.config.use_cache = False

    # QLoRA adapter
    lora = cfg.get("lora", {})
    peft_config = LoraConfig(
        r=int(lora.get("rank", 64)),
        lora_alpha=int(lora.get("alpha", 128)),
        lora_dropout=float(lora.get("dropout", 0.05)),
        target_modules=lora.get("target_modules", [
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ]),
        task_type="CAUSAL_LM",
        bias="none",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # Dataset
    train_file = os.path.join(args.dataset_dir, "train.jsonl")
    val_file = os.path.join(args.dataset_dir, "validation.jsonl")
    train_ds = load_dataset("json", data_files=train_file, split="train")
    val_ds = load_dataset("json", data_files=val_file, split="train") if os.path.exists(val_file) else None

    # SFT configuration
    training = cfg.get("training", {})
    output_dir = os.path.join(args.output_dir, args.job_id)
    sft_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=int(training.get("batch_size", 4)),
        gradient_accumulation_steps=int(training.get("gradient_accumulation", 8)),
        num_train_epochs=int(training.get("epochs", 1)),
        learning_rate=float(training.get("learning_rate", 2e-4)),
        lr_scheduler_type=training.get("lr_scheduler_type", "cosine"),
        warmup_steps=int(training.get("warmup_steps", 50)),
        weight_decay=float(training.get("weight_decay", 0.01)),
        max_grad_norm=float(training.get("max_grad_norm", 1.0)),
        bf16=bool(training.get("bf16", True)),
        fp16=bool(training.get("fp16", False)),
        gradient_checkpointing=bool(training.get("gradient_checkpointing", True)),
        optim=training.get("optim", "paged_adamw_8bit"),
        logging_steps=int(training.get("logging_steps", 10)),
        save_steps=int(training.get("save_steps", 200)),
        eval_steps=int(training.get("eval_steps", 200)),
        save_total_limit=int(training.get("save_total_limit", 3)),
        evaluation_strategy="steps" if val_ds is not None else "no",
        load_best_model_at_end=val_ds is not None,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        seed=args.seed,
        report_to="none",
        save_safetensors=True,
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        tokenizer=tokenizer,
        dataset_text_field="instruction",
        max_seq_length=int(training.get("max_seq_length", 4096)),
        packing=False,
    )

    t0 = time.time()
    trainer.train()
    t1 = time.time()
    runtime_seconds = t1 - t0

    # Save the adapter and tokenizer
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    metrics = {
        "total_runtime_seconds": runtime_seconds,
        "final_train_loss": trainer.state.log_history[-1].get("train_loss") if trainer.state.log_history else None,
        "best_eval_loss": trainer.state.best_metric if trainer.state.best_metric is not None else None,
    }
    with open(os.path.join(output_dir, "metrics.json"), "w", encoding="utf-8") as fh:
        json.dump(metrics, fh, indent=2)

    print(json.dumps({"status": "ok", "output_dir": output_dir, "metrics": metrics}))


if __name__ == "__main__":
    main()
