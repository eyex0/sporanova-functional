# NOVA Dataset Versioning

## Version Numbering

NOVA uses semantic-style versioning for datasets:

```
v<major>.<minor>
```

| Component | Rules |
|-----------|-------|
| **major** | Increment for breaking changes: schema migration, format change, category removal |
| **minor** | Increment for additions: new categories, more samples, improved filtering |

Examples:

- `v0.1` → Initial synthetic dataset, 100k samples, English only
- `v0.2` → Added multilingual (50k samples), improved quality filter
- `v0.3` → Added contamination check, new categories, 285k samples
- `v1.0` → Production-ready, all evaluation benchmarks pass

## Dataset Manifest Structure

Every versioned dataset lives in `training/datasets/<version>/` and must contain:

```
training/datasets/v0.3/
├── manifest.json        # Version metadata and statistics
├── train.jsonl          # Training split
├── val.jsonl            # Validation split
└── category_stats.json  # Per-category breakdown
```

### manifest.json

```json
{
  "version": "0.3",
  "created": "2026-03-15T10:30:00Z",
  "schema_version": 2,
  "stats": {
    "total_samples": 285000,
    "train_samples": 270000,
    "val_samples": 15000,
    "avg_length_tokens": 512,
    "median_length_tokens": 384,
    "max_length_tokens": 4096
  },
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
  },
  "quality": {
    "avg_perplexity": 12.4,
    "avg_quality_score": 0.82,
    "pass_rate_length": 0.99,
    "pass_rate_ratio": 0.97,
    "contamination_rate": 0.001
  },
  "lineage": {
    "base_version": "v0.2",
    "generation_model": "gpt-4o-mini",
    "filtering_version": "1.2.0",
    "seed": 42,
    "generation_config_hash": "a1b2c3d4"
  }
}
```

### category_stats.json

```json
{
  "math": {
    "count": 51300,
    "avg_tokens": 620,
    "avg_quality": 0.85,
    "languages": {"en": 0.70, "ar": 0.12, "other": 0.18}
  },
  "code": {
    "count": 62700,
    "avg_tokens": 480,
    "avg_quality": 0.88,
    "languages": {"en": 0.90, "other": 0.10}
  }
}
```

## Comparing Dataset Versions

Use the comparison script to diff two versions:

```bash
python training/scripts/compare_versions.py \
  --old training/datasets/v0.2/ \
  --new training/datasets/v0.3/ \
  --output reports/dataset_diff_v02_v03.json
```

### Output format

```json
{
  "versions": {"old": "v0.2", "new": "v0.3"},
  "total_samples": {"old": 180000, "new": 285000, "delta": 105000},
  "quality": {
    "avg_perplexity": {"old": 14.2, "new": 12.4, "delta": -1.8},
    "avg_quality_score": {"old": 0.78, "new": 0.82, "delta": 0.04}
  },
  "category_changes": {
    "added": ["multilingual"],
    "removed": [],
    "changed": {
      "math": {"old_count": 32000, "new_count": 51300},
      "code": {"old_count": 40000, "new_count": 62700}
    }
  },
  "contamination": {
    "old_rate": 0.005,
    "new_rate": 0.001
  }
}
```

## Quality Statistics Tracking

Track quality metrics across versions to detect regressions:

```bash
python training/scripts/quality_trend.py \
  --versions v0.1 v0.2 v0.3 \
  --output reports/quality_trend.json
```

### Metrics tracked per version

| Metric | Target | Description |
|--------|--------|-------------|
| avg_perplexity | < 15.0 | Lower is better (language model fit) |
| avg_quality_score | > 0.75 | Heuristic quality (0-1 scale) |
| contamination_rate | < 0.005 | Overlap with evaluation benchmarks |
| pass_rate_length | > 0.99 | Samples within token limits |
| pass_rate_ratio | > 0.95 | Input/output length ratio valid |

## Language Distribution

Ensure multilingual coverage meets targets:

```json
{
  "targets": {
    "en": {"min": 0.50, "max": 0.75},
    "ar": {"min": 0.05, "max": 0.15},
    "fr": {"min": 0.05, "max": 0.12},
    "de": {"min": 0.05, "max": 0.12},
    "es": {"min": 0.03, "max": 0.10},
    "other": {"min": 0.02, "max": 0.10}
  }
}
```

Validate with:

```bash
python training/scripts/validate_dataset.py \
  --dataset training/datasets/v0.3/ \
  --checks language_distribution
```

## Contamination Prevention

Contamination occurs when training data overlaps with evaluation benchmarks.

### Detection

```bash
python training/filtering/contamination_check.py \
  --input training/datasets/scored/ \
  --benchmarks data/eval/benchmarks/ \
  --ngram-size 13 \
  --output training/datasets/clean/ \
  --report reports/contamination_v0.3.json
```

### Method

1. Extract all 13-grams from benchmark test sets
2. Hash each n-gram for fast lookup
3. Scan training samples for matching n-grams
4. Flag samples with > 30% n-gram overlap
5. Remove flagged samples from dataset

### Thresholds

| Threshold | Action |
|-----------|--------|
| < 0.1% | Pass — no action needed |
| 0.1% - 0.5% | Warn — review flagged samples |
| 0.5% - 2.0% | Fail — re-filter with stricter dedup |
| > 2.0% | Critical — regenerate affected categories |

## Creating a New Version

```bash
# 1. Generate raw data
python training/generation/generate.py \
  --config training/generation/config.yaml \
  --output training/datasets/raw/

# 2. Run full pipeline
python training/scripts/build_dataset.py \
  --raw-dir training/datasets/raw/ \
  --output-dir training/datasets/v0.4/ \
  --version v0.4

# 3. Validate
python training/scripts/validate_dataset.py \
  --dataset training/datasets/v0.4/

# 4. Compare with previous version
python training/scripts/compare_versions.py \
  --old training/datasets/v0.3/ \
  --new training/datasets/v0.4/

# 5. Commit
git add training/datasets/v0.4/
git commit -m "dataset: add v0.4 with expanded code category"
```
