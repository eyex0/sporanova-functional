# NOVA Training Plan

**Date:** 2026-09-03
**Status:** PLANNED

---

## Overview

NOVA training follows a progressive approach:
1. **LoRA/QLoRA** — Quick fine-tuning with minimal compute
2. **Full Fine-tuning** — Complete model specialization
3. **RLHF** — Alignment with human preferences

---

## Phase 1: LoRA/QLoRA Fine-Tuning

### Timeline
**Q1 2027** (3 months)

### Base Model
**Qwen 2.5 72B Instruct**

### Approach
**QLoRA** (Quantized LoRA) — Fine-tune on quantized model for cost efficiency

### Hardware Requirements
| Component | Requirement |
|-----------|-------------|
| GPU | 1x A100 80GB or 2x RTX 4090 |
| RAM | 64GB minimum |
| Storage | 500GB SSD |
| Estimated Cost | $2-4K/month (cloud) |

### Training Configuration
```yaml
base_model: Qwen/Qwen2.5-72B-Instruct
method: qlora
quantization: 4-bit (NF4)
lora_rank: 64
lora_alpha: 128
lora_dropout: 0.05
target_modules: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
learning_rate: 2e-4
batch_size: 4
gradient_accumulation_steps: 8
epochs: 3
warmup_steps: 100
max_seq_length: 8192
```

### Training Data
| Category | Examples | Source |
|----------|----------|--------|
| Enterprise reasoning | 10,000 | Generated |
| Tool calling | 5,000 | Synthetic + real |
| Arabic enterprise | 5,000 | Generated |
| SQL/Python/Excel | 5,000 | Code samples |
| Workflow automation | 5,000 | Agent trajectories |
| **Total** | **30,000** | |

### Expected Outcome
- NOVA v0.5
- 10-20% improvement on enterprise benchmarks
- Better tool calling accuracy
- Improved Arabic capability

---

## Phase 2: Full Fine-Tuning

### Timeline
**Q2 2027** (3 months)

### Base Model
**Qwen 2.5 72B Instruct** (or NOVA v0.5)

### Approach
**Full fine-tuning** — Update all model parameters

### Hardware Requirements
| Component | Requirement |
|-----------|-------------|
| GPU | 4x A100 80GB or 8x RTX 4090 |
| RAM | 256GB minimum |
| Storage | 2TB SSD |
| Estimated Cost | $8-15K/month (cloud) |

### Training Configuration
```yaml
base_model: Qwen/Qwen2.5-72B-Instruct
method: full
learning_rate: 1e-5
batch_size: 8
gradient_accumulation_steps: 4
epochs: 2
warmup_steps: 200
max_seq_length: 16384
bf16: true
gradient_checkpointing: true
```

### Training Data
| Category | Examples | Source |
|----------|----------|--------|
| Enterprise reasoning | 30,000 | Generated + real |
| Tool calling | 15,000 | Agent trajectories |
| Arabic enterprise | 15,000 | Generated + real |
| SQL/Python/Excel | 15,000 | Code samples |
| Workflow automation | 15,000 | Agent trajectories |
| Multi-step agents | 10,000 | Complex tasks |
| Error recovery | 5,000 | Failure cases |
| **Total** | **105,000** | |

### Expected Outcome
- NOVA v1.0
- 30-50% improvement on enterprise benchmarks
- Competitive with GPT-4o on enterprise tasks
- Superior Arabic capability

---

## Phase 3: RLHF (Reinforcement Learning from Human Feedback)

### Timeline
**Q3 2027** (3 months)

### Approach
**DPO (Direct Preference Optimization)** — Align with human preferences

### Hardware Requirements
| Component | Requirement |
|-----------|-------------|
| GPU | 4x A100 80GB |
| RAM | 256GB minimum |
| Storage | 2TB SSD |
| Estimated Cost | $8-15K/month (cloud) |

### Training Data
| Category | Examples | Source |
|----------|----------|--------|
| Preference pairs | 50,000 | Human annotations |
| Safety examples | 10,000 | Generated |
| **Total** | **60,000** | |

### Expected Outcome
- NOVA v1.5
- Better alignment with user intent
- Improved safety
- More natural responses

---

## Dataset Schema

### Conversation Format
```json
{
  "id": "uuid",
  "category": "enterprise_reasoning",
  "subcategory": "business_analysis",
  "language": "ar",
  "difficulty": "hard",
  "messages": [
    {
      "role": "system",
      "content": "You are NOVA, the intelligence platform for SOPRANOVA agents."
    },
    {
      "role": "user",
      "content": "Analyze this sales data and provide recommendations."
    },
    {
      "role": "assistant",
      "content": "Based on the data...",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "sql_query",
            "arguments": "{\"query\": \"SELECT...\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "content": "[[1, 'Product A', 1000], ...]",
      "tool_call_id": "call_1"
    },
    {
      "role": "assistant",
      "content": "Here's my analysis..."
    }
  ],
  "metadata": {
    "quality_score": 0.9,
    "source": "generated",
    "verified": true
  }
}
```

### Tool Call Format
```json
{
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "sql_query",
        "arguments": "{\"query\": \"SELECT * FROM sales WHERE date > '2026-01-01'\"}"
      }
    }
  ]
}
```

### Expected Output Format
```json
{
  "content": "Based on the analysis, I recommend...",
  "reasoning": "The data shows...",
  "tool_calls": [...],
  "confidence": 0.85
}
```

---

## Training Pipeline

### 1. Data Collection
- Collect real agent conversations
- Generate synthetic examples
- Annotate with human feedback
- Validate quality

### 2. Data Preprocessing
- Clean and normalize
- Remove PII
- Tokenize
- Create train/val/test splits

### 3. Training
- LoRA/QLoRA (Phase 1)
- Full fine-tuning (Phase 2)
- RLHF (Phase 3)

### 4. Evaluation
- Run benchmarks
- Compare with base model
- Test on held-out data
- Human evaluation

### 5. Deployment
- Export checkpoints
- Convert to inference format
- Deploy to production
- Monitor performance

---

## Evaluation Metrics

### Automatic Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| Task Success Rate | % of tasks completed correctly | >80% |
| Tool Call Accuracy | % of correct tool calls | >90% |
| JSON Validity | % of valid JSON output | >99% |
| Instruction Following | % of instructions followed | >85% |
| Arabic Quality | Arabic language quality score | >85% |
| English Quality | English language quality score | >85% |

### Human Evaluation
| Metric | Description | Target |
|--------|-------------|--------|
| Response Quality | Overall quality score | >4/5 |
| Relevance | How relevant is the response | >4/5 |
| Helpfulness | How helpful is the response | >4/5 |
| Safety | Is the response safe | >4.5/5 |

---

## Cost Estimation

### Phase 1: LoRA/QLoRA
| Item | Cost |
|------|------|
| Cloud GPU (1 month) | $3,000 |
| Data generation | $5,000 |
| Human annotation | $5,000 |
| **Total** | **$13,000** |

### Phase 2: Full Fine-tuning
| Item | Cost |
|------|------|
| Cloud GPU (2 months) | $20,000 |
| Data generation | $10,000 |
| Human annotation | $15,000 |
| **Total** | **$45,000** |

### Phase 3: RLHF
| Item | Cost |
|------|------|
| Cloud GPU (2 months) | $20,000 |
| Human annotation | $20,000 |
| **Total** | **$40,000** |

### **Grand Total: $98,000**

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Insufficient training data | High | Start with synthetic data, augment with real |
| GPU availability | Medium | Use cloud providers, plan ahead |
| Model degradation | High | Extensive evaluation, A/B testing |
| Cost overrun | Medium | Phase training, monitor costs |
| Timeline delays | Medium | Build buffer, parallel work |

---

## Next Steps

1. **Q4 2026:** Finalize base model selection
2. **Q4 2026:** Build data collection pipeline
3. **Q1 2027:** Start LoRA training
4. **Q1 2027:** Evaluate NOVA v0.5
5. **Q2 2027:** Start full fine-tuning
6. **Q2 2027:** Evaluate NOVA v1.0
7. **Q3 2027:** Start RLHF
8. **Q3 2027:** Deploy NOVA v1.5
