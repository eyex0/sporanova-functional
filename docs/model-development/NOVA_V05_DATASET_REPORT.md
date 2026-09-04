# NOVA v0.5 Dataset Report

**Dataset**: nova-ds-v0.5.1-1788518414909-0f297099
**Version**: v0.5.1
**Generator**: nova-production-generator-v0.5.1 / synthesizer-v1
**Seed**: 20260904
**Content SHA-256**: 8087015c0478f00186ec8dd7ad226085e7cc9623a64b9b80739a8d1bc3b89744
**Date**: 2026-09-04
**Status**: READY_FOR_TRAINING

---

## Overview

The NOVA v0.5 dataset was generated deterministically using combinatorial multi-dimensional instruction synthesis. All 35,020 examples are synthetic, balanced across 34 categories and 3 languages.

| Metric | Value |
|--------|-------|
| Total examples | 35,020 |
| Unique examples | 35,020 (0.00% duplicates) |
| Train | 28,016 (80.0%) |
| Validation | 3,502 (10.0%) |
| Test | 3,502 (10.0%) |
| Avg quality | 0.8702 |
| Min quality | 0.75 |
| Max quality | 0.99 |

## Category Distribution (34 categories, 1,030 each)

| Category | Count | Avg Quality | Avg Instruction (chars) |
|----------|-------|-------------|------------------------|
| enterprise_reasoning | 1030 | 0.8717 | 213 |
| agent_planning | 1030 | 0.8659 | 207.8 |
| tool_calling | 1030 | 0.8685 | 191.6 |
| multi_step_tool_execution | 1030 | 0.8692 | 185.5 |
| tool_error_recovery | 1030 | 0.8699 | 203.8 |
| structured_output | 1030 | 0.8711 | 147.9 |
| json_generation | 1030 | 0.8744 | 145.6 |
| sql | 1030 | 0.8696 | 153 |
| coding | 1030 | 0.8691 | 179.6 |
| rag_usage | 1030 | 0.8705 | 165 |
| memory_usage | 1030 | 0.8723 | 161.2 |
| workflow_execution | 1030 | 0.8695 | 166.2 |
| customer_support | 1030 | 0.8725 | 168.6 |
| business_intelligence | 1030 | 0.8672 | 158.6 |
| arabic | 1030 | 0.8737 | 149.1 |
| data_analysis | 1030 | 0.867 | 168.1 |
| lead_qualification | 1030 | 0.8723 | 149.1 |
| sales_workflows | 1030 | 0.8725 | 185.2 |
| helpdesk_workflows | 1030 | 0.8735 | 175 |
| enterprise_integrations | 1030 | 0.8747 | 153.4 |
| arabic_msa | 1030 | 0.8666 | 151.2 |
| arabic_dialects | 1030 | 0.869 | 143.5 |
| arabic_english_code_switching | 1030 | 0.8695 | 168.1 |
| ambiguous_requests | 1030 | 0.8699 | 172.9 |
| long_context_reasoning | 1030 | 0.8678 | 177.3 |
| permission_aware_agent | 1030 | 0.872 | 174.6 |
| multi_agent_coordination | 1030 | 0.8708 | 178.3 |
| sporanova_agent_workflows | 1030 | 0.8683 | 198.4 |
| english | 1030 | 0.8665 | 162.3 |
| code_switching | 1030 | 0.8714 | 161.4 |
| prompt_injection_defense | 1030 | 0.8701 | 162.5 |
| security_sensitive | 1030 | 0.8721 | 193.1 |
| enterprise_decision_making | 1030 | 0.8689 | 186.4 |
| english_enterprise | 1030 | 0.8675 | 162.9 |

## Language Distribution

| Language | Count | Percentage |
|----------|-------|-----------|
| en | 29,870 | 85.29% |
| ar | 3,090 | 8.82% |
| mixed | 2,060 | 5.88% |

Arabic coverage: 3,090 direct + 2,060 mixed = 5,150 examples with Arabic content (14.7%).

## Difficulty Distribution

| Difficulty | Count | Percentage |
|-----------|-------|-----------|
| easy | 5,284 | 15.09% |
| medium | 6,057 | 17.30% |
| hard | 11,832 | 33.79% |
| expert | 11,847 | 33.83% |

Hard + expert combined: 67.6% of the dataset.

## Quality Distribution

| Metric | Value |
|--------|-------|
| avg | 0.8702 |
| min | 0.75 |
| max | 0.99 |
| median | 0.87 |
| p10 | 0.77 |
| p25 | 0.81 |
| p75 | 0.93 |
| p90 | 0.97 |
| p95 | 0.98 |

Minimum quality (0.75) exceeds the gate threshold (0.70). All examples pass quality.

## Instruction / Answer Length

| Field | Avg (chars) | Min | Max | Avg (words) |
|-------|-------------|-----|-----|-------------|
| instruction | 171.2 | 90 | 339 | 26 |
| final_answer | 204.7 | 60 | 447 | 24.8 |

## Tool Usage

- With tools: 13,390 (38.2%)
- Without tools: 21,630 (61.8%)

| Tool | Count |
|------|-------|
| crm_query | 7,210 |
| kb_search | 3,090 |
| exchange_rate | 1,030 |
| pm_create_project | 2,060 |
| run_tests | 4,120 |
| docker_build | 3,090 |
| push_to_registry | 2,060 |
| deploy_staging | 3,090 |
| retrieve_documents | 1,030 |
| memory_store | 1,030 |
| memory_retrieve | 1,030 |
| slack_notify | 4,120 |
| send_email | 5,150 |
| create_calendar_event | 2,060 |

## Trajectory Stats

- With trajectory: 12,360 (35.3%)
- Without trajectory: 22,660 (64.7%)
- Avg trajectory steps: 3.4

## JSON Output

- With JSON: 3,090 (8.8%)
- Without JSON: 31,930 (91.2%)

Categories producing JSON: json_generation, structured_output, business_intelligence, tool_calling, multi_step_tool_execution, workflow_execution.

## Coverage Highlights

- **Tool-calling**: 13,390 examples (38.2%) across 14 tools
- **RAG**: 1,030 examples (rag_usage)
- **Memory**: 1,030 examples (memory_usage)
- **Workflows**: 1,030 examples (workflow_execution)
- **Security/prompt-injection**: 2,060 examples (security_sensitive + prompt_injection_defense)
- **Enterprise reasoning**: 2,060 examples (enterprise_reasoning + enterprise_decision_making)
- **Arabic**: 3,090 direct + 2,060 code-switching
- **English**: 29,870 direct

## Quality Gate Results

All 16 gates pass. 0 critical failures. Ready for training.

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| minimum_examples | 10,000 | 35,020 | PASS |
| target_examples | 30,000 | 35,020 | PASS |
| duplicate_rate | 5% | 0.00% | PASS |
| unresolved_placeholders | 0 | 0 | PASS |
| invalid_json | 0 | 0 | PASS |
| contamination_rate | 1% | 0.00% | PASS |
| pii_rate | 0% | 0.00% | PASS |
| avg_quality | 0.70 | 0.8702 | PASS |
| category_coverage | 28 | 34 | PASS |
| language_coverage | 3 | 3 | PASS |
| all_three_languages | present | present | PASS |
| empty_fields | 0 | 0 | PASS |
| valid_categories | 0 invalid | 0 invalid | PASS |
| valid_languages | 0 invalid | 0 invalid | PASS |
| schema_validity | 0 invalid | 0 invalid | PASS |
| tool_call_validity | 0 invalid | 0 invalid | PASS |

## Contamination Validation

- Production markers: 0
- Raw data markers: 0
- PII patterns: 0
- Cross-split instruction overlap (trainVal/trainTest/valTest): 0/0/0
- Cross-split ID overlap: 0/0/0
- Unresolved placeholders: 0
- Invalid JSON: 0
- Secrets/API keys: 0
- Prompt injection: 0
- Malformed ChatML: 0
- Empty fields: 0

## Files

```
training/datasets/v0.5/
  train.jsonl         — 28,016 examples
  validation.jsonl    —  3,502 examples
  test.jsonl          —  3,502 examples
  manifest.json       — Dataset manifest
  provenance.json     — Provenance record (SHA-256, seed, versions)
  stats.json          — Full statistics
  quality-gates.json  — Gate results
```

## Reproducibility

The dataset can be regenerated identically with:

```bash
npx tsx training/scripts/generate_v05_dataset.ts
```

This uses deterministic seed 20260904 and Mulberry32 PRNG. The content hash is SHA-256 of sorted-by-ID serialized examples.
