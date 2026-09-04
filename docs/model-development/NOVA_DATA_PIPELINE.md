# NOVA Data Pipeline

## Overview

The NOVA data pipeline manages synthetic dataset generation, filtering, quality assurance, and versioning for model training. All data flows through a deterministic pipeline with reproducibility guarantees.

## Directory Structure

```
training/
├── datasets/                  # Final, versioned datasets
│   ├── v0.1/
│   │   ├── manifest.json
│   │   ├── train.jsonl
│   │   └── val.jsonl
│   └── v0.2/
├── generation/                # Synthetic data generation scripts
│   ├── generate.py
│   ├── prompts/
│   │   ├── math.jsonl
│   │   ├── code.jsonl
│   │   ├── reasoning.jsonl
│   │   └── multilingual.jsonl
│   └── config.yaml
├── filtering/                 # Quality filtering pipeline
│   ├── filter.py
│   ├── deduplicate.py
│   ├── quality_score.py
│   └── contamination_check.py
└── scripts/
    ├── build_dataset.py       # Orchestrates full pipeline
    ├── validate_dataset.py    # Pre-training validation
    └── compare_versions.py    # Diff two dataset versions
```

## Generating Synthetic Data

### 1. Configure generation parameters

Edit `training/generation/config.yaml`:

```yaml
generation:
  model: "gpt-4o-mini"
  temperature: 0.8
  max_tokens: 2048
  samples_per_category: 50000
  categories:
    - math
    - code
    - reasoning
    - multilingual
    - creative_writing
    - factual_qa
    - instruction_following
```

### 2. Run generation

```bash
cd training/generation
python generate.py --config config.yaml --output ../datasets/raw/
```

### 3. Verify raw output

```bash
wc -l ../datasets/raw/*.jsonl
# Expected: ~350,000 lines across all categories
```

## Filtering and Quality Checks

### Deduplication

```bash
python training/filtering/deduplicate.py \
  --input training/datasets/raw/ \
  --output training/datasets/deduped/ \
  --method minhash \
  --threshold 0.85
```

### Quality scoring

```bash
python training/filtering/quality_score.py \
  --input training/datasets/deduped/ \
  --output training/datasets/scored/ \
  --min-score 0.7 \
  --rules length,ratio,perplexity
```

### Contamination check

```bash
python training/filtering/contamination_check.py \
  --input training/datasets/scored/ \
  --benchmarks data/eval/benchmarks/ \
  --output training/datasets/clean/ \
  --ngram-size 13
```

### Run full pipeline

```bash
python training/scripts/build_dataset.py \
  --raw-dir training/datasets/raw/ \
  --output-dir training/datasets/v0.3/ \
  --version v0.3 \
  --dedup-threshold 0.85 \
  --min-quality 0.7
```

## Dataset Manifests

Each versioned dataset includes a `manifest.json`:

```json
{
  "version": "0.3",
  "created": "2026-03-15T10:30:00Z",
  "stats": {
    "total_samples": 285000,
    "train_samples": 270000,
    "val_samples": 15000,
    "avg_length_tokens": 512,
    "language_distribution": {
      "en": 0.65,
      "ar": 0.10,
      "fr": 0.08,
      "de": 0.07,
      "es": 0.05,
      "other": 0.05
    },
    "category_distribution": {
      "math": 0.18,
      "code": 0.22,
      "reasoning": 0.20,
      "multilingual": 0.15,
      "creative_writing": 0.10,
      "factual_qa": 0.10,
      "instruction_following": 0.05
    }
  },
  "quality": {
    "avg_perplexity": 12.4,
    "avg_quality_score": 0.82,
    "contamination_rate": 0.001
  },
  "pipeline": {
    "generation_model": "gpt-4o-mini",
    "filtering_version": "1.2.0",
    "seed": 42
  }
}
```

## Dataset Versioning Scheme

Format: `v<major>.<minor>` (e.g., `v0.1`, `v0.2`, `v1.0`)

| Version | Description |
|---------|-------------|
| v0.1 | Initial synthetic dataset, English only |
| v0.2 | Added multilingual, improved filtering |
| v0.3 | Expanded categories, contamination-free |
| v1.0 | Production-ready, all benchmarks pass |

Bump **minor** for additions (new categories, more samples). Bump **major** for breaking changes (schema change, format migration).

## Validation

Before training, validate the dataset:

```bash
python training/scripts/validate_dataset.py \
  --dataset training/datasets/v0.3/ \
  --checks schema,completeness,balance,contamination
```

Expected output:

```
[PASS] Schema validation: all fields present
[PASS] Completeness: 0.0% missing values
[PASS] Balance: no category > 30% of total
[PASS] Contamination: < 0.5% overlap with benchmarks
```
