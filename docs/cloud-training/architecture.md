# NOVA Cloud Training Infrastructure — Architecture Overview

## Overview

The cloud-training infrastructure provides the interfaces, orchestration logic,
and lifecycle management for training NOVA on top of Qwen2.5-72B-Instruct.  It
is a **configuration and orchestration layer only** — it never auto-downloads
weights, never auto-starts GPU jobs, and never auto-promotes checkpoints.

## Module Layout

```
training/cloud/
├── index.ts                              # Public barrel export
├── storage/layout.ts                     # Canonical S3 object-layout
├── providers/
│   ├── gpu_provider.ts                   # NovaGPUProvider interface + Mock + cost catalog
│   ├── aws.ts                            # AWS GPU provider stub
│   └── runpod.ts                         # RunPod GPU provider stub
├── jobs/orchestrator.ts                  # NovaTrainingOrchestrator (job lifecycle)
├── evaluation/real_evaluation.ts         # RealEvaluationHarness (BASE vs CANDIDATE)
├── lifecycle.ts                          # NovaModelLifecycle (promotion gates, rollback)
├── continuous_learning_orchestrator.ts   # Production → candidate pipeline
├── scheduled_pipeline.ts                 # Nightly + weekly pipeline configuration
├── serving/inference_server.ts           # OpenAI-compatible inference abstraction
├── observability.ts                      # Training metrics & logging
├── qlora/train.py                        # QLoRA training script (NEVER auto-executed)
└── (test files in server/)
```

## Core Concepts

| Concept | Module | Purpose |
|---------|--------|---------|
| GPU Provider | `providers/gpu_provider.ts` | Abstract GPU submission, status, logs, cancel, download |
| Storage Layout | `storage/layout.ts` | Canonical S3 path scheme for datasets, checkpoints, evaluations |
| Job Orchestrator | `jobs/orchestrator.ts` | State machine: QUEUED → RUNNING → COMPLETED → EVALUATING → APPROVED/REJECTED |
| Evaluation | `evaluation/real_evaluation.ts` | 14-category BASE vs CANDIDATE comparison |
| Model Lifecycle | `lifecycle.ts` | Foundation → TRAINING → EVALUATION → CANDIDATE → APPROVED → PRODUCTION → DEPRECATED |
| Continuous Learning | `continuous_learning_orchestrator.ts` | Production conversations → anonymized training candidates |
| Scheduled Pipeline | `scheduled_pipeline.ts` | Nightly and weekly pipeline step configurations |
| Inference | `serving/inference_server.ts` | OpenAI-compatible API surface for vLLM / TGI / mock |
| Observability | `observability.ts` | Loss curves, GPU utilisation, tokens/sec, cost tracking |

## Design Principles

1. **Config-only, never auto-executing** — the GPU job must be picked up by a human operator.
2. **Provenance-first** — every checkpoint, dataset, and evaluation is content-hashed and recorded.
3. **Safety by default** — promotion gates, contamination guards, and PII scrubbing are mandatory.
4. **Provider-agnostic** — the GPU provider interface supports AWS, RunPod, Lambda, Modal, Vast, GCP, Azure.
5. **Deterministic** — fixed seeds, bf16, gradient checkpointing ensure reproducibility.

## Data Flow

```
Production conversations
  → Continuous Learning Orchestrator (anonymize, quality, contamination)
    → Versioned Candidate Dataset
      → Training Job (operator runs on GPU)
        → Checkpoint + Provenance
          → Real Evaluation Harness (14 categories)
            → Promotion Gates (6 gates)
              → APPROVED → Production deployment
```
