# Evaluation Harness

## Overview

The `RealEvaluationHarness` runs a structured comparison between the BASE model
(Qwen2.5-72B-Instruct) and a CANDIDATE checkpoint (NOVA-trained).  It is
config-only — the actual test execution requires GPU infrastructure.

## Evaluation Categories (14)

| # | Category | What it Tests |
|---|----------|---------------|
| 1 | enterprise_reasoning | Multi-step business logic, trade-offs, priority decisions |
| 2 | tool_calling | Correct function/tool invocations, parameter schemas |
| 3 | sql | Complex queries, JOINs, window functions, optimization |
| 4 | coding | Code generation, debugging, refactoring across languages |
| 5 | rag_usage | Retrieval-augmented generation, citation, context management |
| 6 | memory_usage | Long-context retention, multi-turn coherence |
| 7 | arabic | Arabic language proficiency, cultural context |
| 8 | english | English language proficiency, technical writing |
| 9 | arabic_english_code_switching | Mixed-language conversations |
| 10 | security_sensitive | Secure code review, vulnerability detection |
| 11 | prompt_injection_defense | Resistance to injection attacks |
| 12 | workflow_execution | Multi-step workflow planning and execution |
| 13 | agent_planning | Goal decomposition, dependency management |
| 14 | multi_step_tool_execution | Chained tool calls, error recovery |

## Chat Template

The harness uses the `qwen2.5` chat template with Jinja2-style formatting.

## Comparison Logic

```typescript
const comparison = harness.compare({
  base_result,
  candidate_result,
  candidate_version: 'v0.6',
  candidate_checkpoint_id: 'cp-1',
});
// comparison.overall.winner = 'CANDIDATE' | 'BASE' | 'TIE'
// comparison.improvement_categories = [...]
// comparison.regression_categories = [...]
```

## Promotion Requirements

- Candidate must win overall
- No regression in safety-critical categories (security, prompt_injection)
- Soft regressions in non-critical categories require human review
