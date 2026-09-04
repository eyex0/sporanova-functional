# NOVA v0.5 — Pre-Training Audit Report

**Date**: 2026-09-04
**Auditor**: Montaser Abdalla, Founder & CEO
**Commit**: 47cd516
**Status**: COMPLETE

---

## Audit Checkpoints

### 1. Dataset Generation is Deterministic
**PASS** — SeededRNG (Mulberry32) seeded with SEED=20260904. All picks, shuffles, and random decisions go through the seeded RNG. generateId() uses SHA-256 of seed-index. Same seed always produces the same dataset.

**WARNING**: buildJsonAnswer at production_generator.ts:380 contains a hardcoded '2026-09-04T00:00:00Z' timestamp that is not seeded. Cosmetic only.

### 2. Dataset Provenance is Recorded
**PASS** — provenance.json records: dataset_id, version (v0.5.1), content_sha256, example_count (35020), generator_version, filter_version, random_seed (20260904), and created_at.

**WARNING**: provenance.json has empty file_hashes — no individual split file hashes were computed.

### 3. Dataset Contamination Protection Works
**PASS** — NovaContaminationGuard checks production patterns, raw data markers, PII, is_synthetic consistency, and pii_scrubbed confirmation. Quality gates report 0% contamination rate.

**WARNING**: has_production_markers detail field is always false (cosmetic bug in reporting).

### 4. PII Protection Works
**PASS** — NovaAnonymizer detects emails, phone numbers, SSNs, credit cards, IPs, API keys, passwords. Quality gates report 0% PII rate.

### 5. Quality Gates are Strict Enough
**PASS** — 16 quality gates, 8 critical. All pass. No gate for trajectory validity (checked separately by audit script).

### 6. Train/Validation/Test Split is Correct
**PASS** — 80/10/10 split: 28,016 train / 3,502 validation / 3,502 test = 35,020 total.

### 7. DPO Preference Generation is Valid
**PASS** — 6 degradation strategies. degradeResponse guarantees rejected !== chosen.

**WARNING**: wrong_answer strategy uses hardcoded English replacements that will not match Arabic content.
**WARNING**: generateDPODataset monkey-patches Math.random globally without exception safety.

### 8. QLoRA Configuration is Internally Consistent
**BLOCKER**: train.py line 79 has a critical bug — fh.read() is called twice. The YAML config is NEVER parsed. All training runs with hardcoded defaults.
**BLOCKER**: train.py uses dataset_text_field="instruction" which trains on raw instruction text instead of ChatML-formatted conversations.
**WARNING**: launch_training_job.ts hardcodes warmup_steps: 50 and seed: 20260904, overriding YAML config.

### 9. Base Model Configuration is Consistent Everywhere
**PASS** — All configs, contract, scripts, and registry reference Qwen/Qwen2.5-72B-Instruct.

### 10. Tokenizer Configuration is Correct
**PASS** — Fast tokenizer, model_max_length: 8192, ChatML template.

**WARNING**: train.py does not apply chat template during training.

### 11. ChatML/Template Configuration is Correct
**PASS** — chat_template: qwen2.5 specified in QLoRA config. The contract's inline Python uses apply_chat_template correctly.

**BLOCKER**: train.py does NOT apply the chat template. This is the same issue as #8 above.

### 12. Checkpoint Artifact Contract is Valid
**PASS** — NovaCheckpointValidator checks: adapter_model.safetensors, adapter_config.json, tokenizer files, config.json, data leakage, SHA-256 hash.

**WARNING**: findCheckpointDir only searches one level deep. Data leakage detection is filename-based, not content-based.

### 13. Checkpoint Validator is Correct
**PASS** — Validates adapter_config.json fields (peft_type, target_modules, base_model_name_or_path). Computes SHA-256 of adapter weights.

**WARNING**: Hardcoded base model check — not configurable. SHA-256 only covers adapter_model.safetensors, not other adapter files.

### 14. Evaluation Harness Can Consume a Real Checkpoint
**PASS** — NovaEvalHarness.prepareEvaluation() validates the checkpoint and builds an EvaluationSpec with task groups from benchmark test cases. NovaRealEvaluationHarness.compare() compares BASE vs CANDIDATE across 14 categories.

**WARNING**: eval_harness.ts uses require('fs') inside a function instead of ES module import. Chat template hardcoded to qwen2.5.

### 15. Model Registry Cannot Promote Invalid Checkpoints
**PASS** — NovaModelRegistry.enforce() requires: APPROVED status, metrics present, no other PRODUCTION model. NovaModelLifecycle has 6 promotion gates (provenance, evaluation, regression, improvement, safety, signoff).

**WARNING**: promote() bypasses updateStatus() transition validation. rollbackTo() directly mutates status.

### 16. Cloud Orchestration Cannot Accidentally Launch Jobs
**PASS** — NovaTrainingOrchestrator manages job lifecycle (QUEUED -> RUNNING -> COMPLETED -> EVALUATING -> APPROVED/REJECTED). Jobs must be manually started by an operator. launch_training_job.ts emits a runbook but never starts a GPU.

**WARNING**: Budget enforcement is only at creation and completion — no mid-training cost monitoring.

### 17. Cost Limits are Enforced
**PASS** — NovaTrainingOrchestrator rejects jobs exceeding max_gpu_hours, max_cost_usd, or max_concurrent_jobs. Default budget: 200 GPU hours, $5000, 1 concurrent job.

### 18. Continuous Learning Cannot Ingest Raw Production Conversations
**PASS** — NovaContinuousLearningOrchestrator.ingest() runs PII safety check, anonymization, quality scoring, and contamination guard before creating a candidate. Candidates require human review (PENDING -> APPROVED).

**WARNING**: workspace_id and source_conversation_id are excluded from example metadata to avoid contamination guard false positives. This reduces provenance traceability.

### 19. Secrets Cannot Enter Datasets
**PASS** — NovaAnonymizer replaces API keys, passwords, and tokens. NovaContaminationGuard checks for production patterns. Quality gates enforce 0% PII rate.

### 20. NOVA Runtime Can Eventually Route to a Real Checkpoint
**PASS** — NovaGateway routes to external providers (Groq, OpenAI). The OpenAI provider accepts a configurable baseUrl (AI_BASE_URL env var), so it can point at a self-hosted vLLM/TGI server hosting a real checkpoint. NovaInferenceServer interface supports vLLM, TGI, and mock engines.

---

## Summary

| Category | Count |
|----------|-------|
| PASS | 16 |
| WARNING | 12 |
| BLOCKER | 2 |
| FAIL | 0 |

## BLOCKERS (must fix before first GPU run)

1. **train.py config parsing is broken** — fh.read() called twice, YAML config never parsed
2. **train.py does not apply ChatML template** — trains on raw instruction text, not conversations

## Files Requiring Changes

- training/cloud/qlora/train.py — Fix config parsing and ChatML formatting
- training/datasets/provenance.ts — Fix Windows path handling (path.sep)
- training/generation/quality_gates.ts — Fix has_production_markers reporting
- training/evaluation/test_cases.ts — Fix duplicate test IDs (ar-001 etc.)
