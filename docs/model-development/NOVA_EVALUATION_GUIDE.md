# NOVA Evaluation Guide

## Overview

The evaluation suite runs 17 benchmark categories to measure model capability across reasoning, language, code, math, multilingual, and safety dimensions. Results are stored in machine-readable JSON for automated tracking.

## Running Benchmarks

### Quick start

```bash
cd evaluation/
python run_benchmarks.py \
  --model models/nova-7b-v0.3/ \
  --output results/nova-7b-v0.3/ \
  --categories all
```

### Run specific categories

```bash
python run_benchmarks.py \
  --model models/nova-7b-v0.3/ \
  --output results/nova-7b-v0.3/ \
  --categories math,code,reasoning
```

### Run with custom config

```bash
python run_benchmarks.py \
  --config evaluation/configs/full_eval.yaml \
  --model models/nova-7b-v0.3/ \
  --output results/nova-7b-v0.3/
```

## Benchmark Categories

| # | Category | Benchmarks | Metric |
|---|----------|-----------|--------|
| 1 | Math | GSM8K, MATH | Accuracy |
| 2 | Code | HumanEval, MBPP | pass@1 |
| 3 | Reasoning | ARC-Challenge, HellaSwag | Accuracy |
| 4 | Knowledge | TriviaQA, NaturalQuestions | Accuracy |
| 5 | Reading Comprehension | SQuAD 2.0, BoolQ | F1 |
| 6 | Commonsense | WinoGrande, PIQA | Accuracy |
| 7 | Instruction Following | IFEval | Pass Rate |
| 8 | Multilingual | MGSM, XNLI | Accuracy |
| 9 | Arabic | Arabic-MMLU, Arabic-Hellaswag | Accuracy |
| 10 | Creative Writing | Custom eval (human-rated) | Score (1-5) |
| 11 | Safety | RealToxicityPrompts, BBQ | Toxicity %, Bias Score |
| 12 | Hallucination | TruthfulQA | MC2 Score |
| 13 | Summarization | CNN/DailyMail, XSum | ROUGE-L |
| 14 | Dialogue | DialogRE, MuTual | Accuracy |
| 15 | STEM | AI2-Science, GPQA | Accuracy |
| 16 | Long Context | GovReport, QMSum | ROUGE-L |
| 17 | Agentic | Tool-use benchmark | Success Rate |

## Evaluation Config

```yaml
# evaluation/configs/full_eval.yaml
model:
  path: "models/nova-7b-v0.3/"
  max_tokens: 4096
  temperature: 0.0
  batch_size: 32

categories:
  math:
    benchmarks:
      - name: gsm8k
        shots: 8
        max_samples: 1319
      - name: math
        shots: 4
        max_samples: 5000
  code:
    benchmarks:
      - name: humaneval
        shots: 0
        max_samples: 164
        pass_at_k: [1, 10]
      - name: mbpp
        shots: 3
        max_samples: 500
  reasoning:
    benchmarks:
      - name: arc_challenge
        shots: 25
        max_samples: 1172
      - name: hellaswag
        shots: 10
        max_samples: 10042
  # ... additional categories
```

## Comparing Models

### Head-to-head comparison

```bash
python evaluation/compare_models.py \
  --models \
    results/baseline-7b/ \
    results/nova-7b-v0.3/ \
  --output reports/comparison_baseline_vs_nova.json \
  --format full
```

### Comparison report format

```json
{
  "models": ["baseline-7b", "nova-7b-v0.3"],
  "timestamp": "2026-03-15T14:30:00Z",
  "categories": {
    "math": {
      "gsm8k": {
        "baseline-7b": 52.3,
        "nova-7b-v0.3": 68.7,
        "delta": "+16.4",
        "winner": "nova-7b-v0.3"
      },
      "math": {
        "baseline-7b": 12.1,
        "nova-7b-v0.3": 28.5,
        "delta": "+16.4",
        "winner": "nova-7b-v0.3"
      }
    },
    "code": {
      "humaneval": {
        "baseline-7b": 35.4,
        "nova-7b-v0.3": 52.0,
        "delta": "+16.6",
        "winner": "nova-7b-v0.3"
      }
    }
  },
  "overall": {
    "baseline-7b": {"mean_score": 42.1, "rank": 2},
    "nova-7b-v0.3": {"mean_score": 58.3, "rank": 1}
  }
}
```

### Generate comparison table

```bash
python evaluation/compare_models.py \
  --models results/baseline-7b/ results/nova-7b-v0.3/ \
  --format markdown \
  --output reports/comparison_table.md
```

Output:

```markdown
| Category | Baseline 7B | NOVA 7B v0.3 | Delta |
|----------|-------------|---------------|-------|
| Math (GSM8K) | 52.3 | 68.7 | +16.4 |
| Code (HumanEval) | 35.4 | 52.0 | +16.6 |
| Reasoning (ARC) | 61.2 | 73.8 | +12.6 |
| **Overall Mean** | **42.1** | **58.3** | **+16.2** |
```

## Baseline vs NOVA Comparison

The baseline is a standard 7B parameter model (Llama 3.1 7B or Qwen 2.5 7B) fine-tuned on the same dataset architecture but without NOVA-specific optimizations.

### What NOVA improves over baseline

| Dimension | Baseline | NOVA | Improvement |
|-----------|----------|------|-------------|
| Math reasoning | 52.3 | 68.7 | +31% |
| Code generation | 35.4 | 52.0 | +47% |
| Multilingual | 40.1 | 55.2 | +38% |
| Instruction following | 58.0 | 71.5 | +23% |
| Safety | 72.0 | 85.3 | +18% |

## Reading Comparison Reports

### Score interpretation

| Score Range | Meaning |
|-------------|---------|
| 90-100 | State-of-the-art, production-ready |
| 75-89 | Strong, suitable for most use cases |
| 60-74 | Competent, acceptable for deployment |
| 40-59 | Below average, needs improvement |
| < 40 | Poor, requires retraining |

### Regression detection

A model fails evaluation if:

1. Any single benchmark drops > 5 points from previous best
2. Overall mean drops > 3 points from previous best
3. Any safety benchmark drops below 70

```bash
python evaluation/check_regressions.py \
  --current results/nova-7b-v0.3/ \
  --previous results/nova-7b-v0.2/ \
  --thresholds evaluation/configs/regression_thresholds.json
```

## Machine-Readable Results

All results are stored as JSON in the results directory:

```
results/nova-7b-v0.3/
├── metadata.json          # Model info, config, timestamp
├── math.json              # Math category results
├── code.json              # Code category results
├── reasoning.json         # Reasoning category results
├── knowledge.json         # Knowledge results
├── multilingual.json      # Multilingual results
├── safety.json            # Safety results
├── overall.json           # Aggregated scores
└── raw/                   # Individual benchmark outputs
    ├── gsm8k.jsonl
    ├── humaneval.jsonl
    └── ...
```

### overall.json format

```json
{
  "model": "nova-7b-v0.3",
  "evaluated_at": "2026-03-15T14:30:00Z",
  "mean_score": 58.3,
  "median_score": 56.2,
  "category_scores": {
    "math": 61.2,
    "code": 52.0,
    "reasoning": 67.5,
    "knowledge": 55.1,
    "multilingual": 48.3,
    "safety": 85.3,
    "instruction_following": 71.5
  },
  "pass": true,
  "regressions": []
}
```

## Custom Benchmarks

Add a new benchmark by implementing the interface:

```python
# evaluation/benchmarks/custom_benchmark.py
from evaluation.base import Benchmark

class CustomBenchmark(Benchmark):
    name = "custom_benchmark"
    
    def load_data(self):
        # Load dataset samples
        pass
    
    def evaluate_sample(self, model, sample):
        # Run single sample through model
        pass
    
    def compute_score(self, predictions):
        # Compute aggregate metric
        pass
```

Register in `evaluation/benchmarks/registry.py`:

```python
BENCHMARK_REGISTRY["custom_benchmark"] = CustomBenchmark
```
