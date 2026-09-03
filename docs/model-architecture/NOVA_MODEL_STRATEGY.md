# NOVA Model Strategy

**Date:** 2026-09-03
**Status:** ACTIVE

---

## Current State

**NOVA v0.1 — Foundation Model + NOVA Runtime**

NOVA is currently a **model runtime** that routes to external providers. It is NOT a trained model.

### What NOVA Is
- A unified API for model inference
- A provider routing layer
- A tool calling orchestration system
- A context management engine

### What NOVA Is NOT (Yet)
- A trained foundation model
- A fine-tuned specialist model
- A local inference engine

---

## Model Strategy

### Phase 1: Runtime Foundation (Current)
**Timeline:** Completed
**Approach:** Route to existing providers

**Providers:**
| Provider | Model | Use Case | Cost |
|----------|-------|----------|------|
| Groq | Qwen 3.6-27b | Default agent chat | Free tier |
| OpenAI | GPT-4o | Complex reasoning | $2.50/1M tokens |
| OpenAI | GPT-4o-mini | Simple tasks | $0.15/1M tokens |
| Anthropic | Claude 3.5 Sonnet | Analysis | $3/1M tokens |
| OpenRouter | Multiple | Fallback | Varies |

**Status:** ✅ Active

---

### Phase 2: Base Model Selection
**Timeline:** Q4 2026
**Approach:** Evaluate and select open-weight foundation model

**Candidates:**

| Model | Parameters | Arabic | English | Coding | Tool Calling | Context | License |
|-------|-----------|--------|---------|--------|--------------|---------|---------|
| Qwen 2.5 72B | 72B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | Apache 2.0 |
| Qwen 2.5 32B | 32B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 128K | Apache 2.0 |
| Qwen 2.5 14B | 14B | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 128K | Apache 2.0 |
| Llama 3.1 70B | 70B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | Llama License |
| Mistral Large 2 | 123B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | Apache 2.0 |
| DeepSeek V3 | 671B MoE | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | MIT |

**Recommendation:** Qwen 2.5 72B
- Best Arabic capability
- Strong English and coding
- Apache 2.0 license (commercial friendly)
- Good tool calling support
- 128K context window
- Fine-tuning feasible

**Status:** 🔄 In Evaluation

---

### Phase 3: LoRA Fine-Tuning
**Timeline:** Q1 2027
**Approach:** LoRA/QLoRA fine-tuning on Qwen 2.5 72B

**Training Data:**
- Enterprise reasoning (10K examples)
- Tool calling (5K examples)
- Arabic enterprise tasks (5K examples)
- SQL/Python/Excel (5K examples)
- Workflow automation (5K examples)

**Expected Outcome:**
- NOVA v0.5 — Fine-tuned for enterprise agent tasks
- 10-20% improvement on enterprise benchmarks
- Better Arabic capability
- Better tool calling accuracy

**Status:** 📋 Planned

---

### Phase 4: Full Fine-Tuning
**Timeline:** Q2 2027
**Approach:** Full fine-tuning on Qwen 2.5 72B

**Training Data:**
- 100K+ enterprise examples
- Multi-step agent trajectories
- Complex reasoning chains
- Arabic dialect handling
- Error recovery patterns

**Expected Outcome:**
- NOVA v1.0 — Specialized enterprise agent model
- 30-50% improvement on enterprise benchmarks
- Competitive with GPT-4o on enterprise tasks
- Superior Arabic capability

**Status:** 📋 Planned

---

### Phase 5: Production Deployment
**Timeline:** Q3 2027
**Approach:** Deploy NOVA as primary model

**Infrastructure:**
- 4x H100 GPUs for inference
- Load balancing across GPUs
- Automatic failover
- Cost monitoring

**Expected Outcome:**
- NOVA as default model for all SOPRANOVA agents
- Reduced cost vs external providers
- Full control over model behavior
- Continuous improvement via feedback loops

**Status:** 📋 Planned

---

## Cost Analysis

### Current (External Providers)
| Scenario | Monthly Cost |
|----------|-------------|
| 1K agents, 100 msgs/day | ~$500 |
| 10K agents, 100 msgs/day | ~$5,000 |
| 100K agents, 100 msgs/day | ~$50,000 |

### With NOVA (Self-hosted)
| Scenario | Monthly Cost |
|----------|-------------|
| 1K agents, 100 msgs/day | ~$200 (1x H100) |
| 10K agents, 100 msgs/day | ~$1,500 (4x H100) |
| 100K agents, 100 msgs/day | ~$10,000 (8x H100) |

**Break-even:** ~5K agents

---

## Decision Matrix

| Factor | External Providers | NOVA (Fine-tuned) |
|--------|-------------------|-------------------|
| Setup cost | $0 | $68-120K |
| Monthly cost (10K agents) | $5,000 | $1,500 |
| Customization | Limited | Full |
| Arabic optimization | Provider-dependent | Custom |
| Data privacy | Provider-dependent | Full control |
| Latency | Network-dependent | Local |
| Availability | Provider-dependent | Self-managed |

---

## Recommendation

**Start with Phase 1 (Runtime) — Completed**
**Begin Phase 2 (Base Model Selection) — Q4 2026**
**Proceed to Phase 3 (LoRA) — Q1 2027**

The NOVA runtime provides immediate value while the model is being developed.
