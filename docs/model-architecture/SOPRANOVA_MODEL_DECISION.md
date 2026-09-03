# SOPRANOVA Model Decision Document

**Date:** 2026-09-03
**Status:** FINAL RECOMMENDATION

---

## Executive Summary

After deep analysis of the Kimi codebase and industry landscape, this document provides final recommendations for SOPRANOVA's model strategy.

**Key Finding:** The Kimi codebase (`kimi-code-main`) is a **client-side agent application**, NOT a model training/inference codebase. It contains zero model architecture code. The real value for SOPRANOVA is in the **agent orchestration patterns**, not model internals.

---

## Final Recommendations

### 1. What base model should we start from?

**RECOMMENDATION: Qwen 2.5 72B**

| Factor | Qwen 2.5 72B | Llama 3.1 70B | DeepSeek V3 |
|--------|-------------|---------------|-------------|
| Arabic quality | ✅ Excellent | ⚠️ Good | ✅ Good |
| English quality | ✅ Excellent | ✅ Excellent | ✅ Excellent |
| Tool calling | ✅ Native | ✅ Native | ✅ Native |
| Context window | 128k | 128k | 128k |
| Open weights | ✅ Yes | ✅ Yes | ✅ Yes |
| Commercial license | ✅ Apache 2.0 | ✅ Llama License | ✅ MIT |
| Inference cost | Medium | Medium | High (MoE) |
| Arabic-English code switching | ✅ Excellent | ⚠️ Good | ✅ Good |

**Rationale:**
- Best Arabic + English balance
- Strong tool calling support
- Active community and ecosystem
- Commercial-friendly license
- Available on all major cloud platforms

### 2. Should we use Kimi architecture?

**RECOMMENDATION: NO — Use Kimi's AGENT patterns, NOT model architecture**

The Kimi codebase contains:
- ✅ **Agent orchestration patterns** — REUSE as inspiration
- ✅ **Tool calling system design** — REUSE as inspiration
- ✅ **Context management strategies** — REUSE as inspiration
- ❌ **Model architecture** — NOT PRESENT in codebase
- ❌ **Training pipelines** — NOT PRESENT in codebase
- ❌ **Inference optimizations** — NOT PRESENT in codebase

**What SOPRANOVA should extract from Kimi:**
1. Multi-provider model abstraction (Kosong pattern)
2. Tool calling lifecycle (preflight → authorize → execute → finalize)
3. Context compaction strategies (micro-compaction, head+tail)
4. Permission-based tool gating
5. Goal-directed execution with budgets
6. Streaming normalization across providers

### 3. What can we legally reuse?

**RECOMMENDATION: Architectural patterns under MIT license**

| Component | Legal Status | Action |
|-----------|--------------|--------|
| Agent orchestration patterns | ✅ MIT | Use as inspiration |
| Tool calling format | ✅ Industry standard | Implement independently |
| Context management | ✅ Common pattern | Implement independently |
| Provider abstraction | ✅ Adapter pattern | Implement independently |
| Source code | ⚠️ MIT with attribution | Do not copy directly |
| Model weights | ❌ Not included | Cannot use |
| Training data | ❌ Not included | Cannot use |
| "Kimi" branding | ❌ Trademark | Do not use |

### 4. What should we build ourselves?

**RECOMMENDATION: Build enterprise-specific components**

| Component | Why Build |
|-----------|-----------|
| Enterprise agent orchestration | Optimize for business workflows |
| Arabic enterprise training data | MENA-specific terminology |
| Tool calling for enterprise APIs | SAP, Salesforce, etc. |
| RAG for enterprise documents | Domain-specific retrieval |
| Evaluation benchmarks | Enterprise-specific metrics |
| Safety alignment | Enterprise compliance |

### 5. What should be trained?

**RECOMMENDATION: Fine-tune, not train from scratch**

| Training Stage | Purpose | Cost |
|----------------|---------|------|
| Continued pretraining | Enterprise knowledge | $30-50K |
| Domain adaptation | MENA business terms | $10-20K |
| SFT | Enterprise agent tasks | $10-15K |
| Tool calling SFT | API interaction | $5-10K |
| Agent trajectories | Multi-step workflows | $5-10K |
| DPO/KTO | Preference alignment | $5-10K |
| Safety | Compliance | $3-5K |
| **Total** | **Full fine-tuning** | **$68-120K** |

### 6. What should remain in Agent Runtime?

**RECOMMENDATION: Keep orchestration in SOPRANOVA, not the model**

| Component | Location | Why |
|-----------|----------|-----|
| Tool execution | Agent Runtime | Model should not execute tools |
| Context management | Agent Runtime | Handle window limits |
| Permission checking | Agent Runtime | Security boundary |
| Session management | Agent Runtime | State persistence |
| Multi-provider routing | Agent Runtime | Cost optimization |
| Workflow orchestration | Agent Runtime | Business logic |
| RAG retrieval | Agent Runtime | Domain-specific |

### 7. What should remain in RAG/Memory?

**RECOMMENDATION: Keep retrieval separate from model**

| Component | Location | Why |
|-----------|----------|-----|
| Document indexing | RAG System | Infrastructure concern |
| Vector search | RAG System | Specialized hardware |
| Citation tracking | RAG System | Metadata management |
| Conversation memory | Memory System | State management |
| Knowledge graph | Memory System | Structured data |

### 8. What should remain in Model Gateway?

**RECOMMENDATION: Keep routing in gateway, not model**

| Component | Location | Why |
|-----------|----------|-----|
| Provider selection | Model Gateway | Cost/latency optimization |
| Load balancing | Model Gateway | Infrastructure concern |
| Rate limiting | Model Gateway | Security concern |
| Caching | Model Gateway | Cost optimization |
| Fallback handling | Model Gateway | Reliability |

### 9. What should the first prototype be?

**RECOMMENDATION: LoRA fine-tune of Qwen 2.5 72B**

**Prototype Scope:**
- Base: Qwen 2.5 72B
- Fine-tuning: LoRA (rank 64)
- Training data: 10K enterprise examples
- Focus: Tool calling + structured output
- Timeline: 4-6 weeks
- Cost: $5-10K

**Prototype Goals:**
1. Reliable tool calling (>90% accuracy)
2. Structured JSON output (>95% validity)
3. Basic Arabic enterprise tasks
4. Basic reasoning and planning

### 10. What should the production model eventually become?

**RECOMMENDATION: Full fine-tune with continuous improvement**

**Production Model:**
- Base: Qwen 2.5 72B (or successor)
- Training: Full fine-tuning pipeline
- Focus: Enterprise agent optimization
- Timeline: 6-12 months
- Cost: $68-120K

**Production Goals:**
1. Tool calling accuracy >95%
2. Task completion rate >90%
3. Arabic quality >4/5
4. Hallucination rate <5%
5. Cost efficiency <$1/1M tokens

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Set up training infrastructure
- Curate enterprise training datasets
- Implement evaluation framework
- Download and test Qwen 2.5 72B

### Phase 2: Prototype (Weeks 5-10)
- LoRA fine-tuning experiment
- Tool calling specialization
- Structured output training
- Initial evaluation

### Phase 3: Production Model (Months 3-6)
- Full fine-tuning pipeline
- Domain adaptation
- Agent trajectory training
- Preference optimization

### Phase 4: Deployment (Months 6-9)
- Inference serving setup
- A/B testing framework
- Monitoring and observability
- Production rollout

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Base model limitations | Medium | High | Multiple base options |
| Training data quality | Medium | High | Curated datasets |
| Inference cost overrun | Low | Medium | Quantization |
| Competitive response | High | Medium | Enterprise niche focus |
| Regulatory changes | Low | High | Compliance-first |

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Tool calling accuracy | >95% | Month 6 |
| Task completion rate | >90% | Month 6 |
| Arabic quality | >4/5 | Month 6 |
| Cost per 1M tokens | <$1 | Month 9 |
| Latency (TTFT) | <500ms | Month 6 |
| Throughput | >50 tok/s | Month 6 |

---

## Conclusion

SOPRANOVA should:
1. **Start with Qwen 2.5 72B** as base model
2. **Apply fine-tuning** (LoRA → full) for enterprise specialization
3. **Build proprietary agent orchestration** inspired by Kimi's patterns
4. **Create enterprise-specific evaluation benchmarks**
5. **Deploy with cost-efficient inference** (quantization, caching)

The real competitive advantage is not in recreating a frontier model, but in:
- Enterprise-specific training data
- Reliable tool calling for business APIs
- Arabic + English enterprise communication
- Cost-efficient inference
- Seamless integration with SOPRANOVA's agent system
