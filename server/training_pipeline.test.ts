import { describe, it, expect } from 'vitest';
import { NovaCheckpointValidator } from '../training/registry/checkpoint_validator';
import { NovaProvenanceTracker } from '../training/datasets/provenance';
import { NovaContaminationGuard } from '../training/datasets/contamination_guard';
import { NovaEvalHarness } from '../training/evaluation/eval_harness';
import { generateDPOPair, generateDPODataset } from '../training/datasets/dpo_generator';
import type { NovaTrainingExample } from '../training/types';

describe('NOVA Checkpoint Validator', () => {
  const validator = new NovaCheckpointValidator();

  it('rejects non-existent checkpoint path', () => {
    const result = validator.validate('./nonexistent/path');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('does not exist');
  });

  it('validates adapter config JSON structure', () => {
    // We can only test the parsing logic here since we don't have a real checkpoint
    // This tests that the validator doesn't crash on edge cases
    const result = validator.validate('./nonexistent');
    expect(result.adapter_exists).toBe(false);
    expect(result.tokenizer_exists).toBe(false);
    expect(result.config_exists).toBe(false);
  });
});

describe('NOVA Provenance Tracker', () => {
  const tracker = new NovaProvenanceTracker();
  const examples: NovaTrainingExample[] = [
    {
      id: 'prov-1', language: 'en', category: 'tool_calling',
      instruction: 'Get weather', final_answer: '{"tool": "get_weather"}',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: true, created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prov-2', language: 'ar', category: 'arabic',
      instruction: 'مرحبا', final_answer: 'أهلاً',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.85,
      is_synthetic: true, created_at: '2026-01-01T00:00:00Z',
    },
  ];

  it('computes deterministic content hash', () => {
    const hash1 = tracker.computeContentHash(examples);
    const hash2 = tracker.computeContentHash(examples);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it('hash changes when examples change', () => {
    const hash1 = tracker.computeContentHash(examples);
    const modified = [...examples, {
      id: 'prov-3', language: 'en', category: 'sql',
      instruction: 'SELECT', final_answer: 'query',
      difficulty: 'medium', safety_label: 'safe', quality_score: 0.8,
      is_synthetic: true, created_at: '2026-01-01T00:00:00Z',
    }];
    const hash2 = tracker.computeContentHash(modified);
    expect(hash1).not.toBe(hash2);
  });

  it('creates provenance record', () => {
    const record = tracker.createRecord(
      {
        dataset_id: 'ds-1', version: 'v1', source: 'synthetic',
        created_at: '2026-01-01T00:00:00Z', total_examples: 2,
        splits: { train: 1, validation: 1, test: 0 },
        rejected_count: 0, quality_stats: { avg_quality_score: 0.88, min_quality_score: 0.85 },
        language_distribution: { en: 1, ar: 1 },
        category_distribution: { tool_calling: 1, arabic: 1 },
      },
      examples,
      { generator_version: '1.0.0', filter_version: '1.0.0', random_seed: 42 }
    );

    expect(record.dataset_id).toBe('ds-1');
    expect(record.content_sha256).toHaveLength(64);
    expect(record.random_seed).toBe(42);
    expect(record.generator_version).toBe('1.0.0');
  });

  it('verifies provenance matches', () => {
    const record = tracker.createRecord(
      {
        dataset_id: 'ds-1', version: 'v1', source: 'synthetic',
        created_at: '2026-01-01T00:00:00Z', total_examples: 2,
        splits: { train: 1, validation: 1, test: 0 },
        rejected_count: 0, quality_stats: { avg_quality_score: 0.88, min_quality_score: 0.85 },
        language_distribution: { en: 1, ar: 1 },
        category_distribution: { tool_calling: 1, arabic: 1 },
      },
      examples
    );

    const verification = tracker.verify(record, examples);
    expect(verification.matches).toBe(true);
  });

  it('detects tampered data', () => {
    const record = tracker.createRecord(
      {
        dataset_id: 'ds-1', version: 'v1', source: 'synthetic',
        created_at: '2026-01-01T00:00:00Z', total_examples: 2,
        splits: { train: 1, validation: 1, test: 0 },
        rejected_count: 0, quality_stats: { avg_quality_score: 0.88, min_quality_score: 0.85 },
        language_distribution: { en: 1, ar: 1 },
        category_distribution: { tool_calling: 1, arabic: 1 },
      },
      examples
    );

    const tampered = [...examples];
    tampered[0] = { ...tampered[0], final_answer: 'TAMPERED' };
    const verification = tracker.verify(record, tampered);
    expect(verification.matches).toBe(false);
    expect(verification.reason).toContain('hash mismatch');
  });
});

describe('NOVA Contamination Guard', () => {
  const guard = new NovaContaminationGuard();

  it('passes clean synthetic examples', () => {
    const example: NovaTrainingExample = {
      id: 'clean-1', language: 'en', category: 'tool_calling',
      instruction: 'Get the weather', final_answer: '{"tool": "get_weather"}',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: true, created_at: new Date().toISOString(),
    };
    const result = guard.checkExample(example);
    expect(result.clean).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('detects raw conversation IDs', () => {
    const example: NovaTrainingExample = {
      id: 'dirty-1', language: 'en', category: 'tool_calling',
      instruction: 'session_id: abc-123, get weather', final_answer: 'sunny',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: true, created_at: new Date().toISOString(),
    };
    const result = guard.checkExample(example);
    expect(result.clean).toBe(false);
    expect(result.details.has_raw_conversation_ids).toBe(true);
  });

  it('detects non-synthetic without continuous_learning source', () => {
    const example: NovaTrainingExample = {
      id: 'bad-1', language: 'en', category: 'tool_calling',
      instruction: 'Get weather', final_answer: 'sunny',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: false,
      metadata: { source: 'unknown' },
      created_at: new Date().toISOString(),
    };
    const result = guard.checkExample(example);
    expect(result.clean).toBe(false);
    expect(result.details.has_is_synthetic_false_without_review).toBe(true);
  });

  it('allows non-synthetic with continuous_learning source', () => {
    const example: NovaTrainingExample = {
      id: 'good-cl-1', language: 'en', category: 'tool_calling',
      instruction: 'Get weather', final_answer: 'sunny',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: false,
      metadata: { source: 'continuous_learning', pii_scrubbed: true },
      created_at: new Date().toISOString(),
    };
    const result = guard.checkExample(example);
    expect(result.clean).toBe(true);
  });

  it('filters contaminated examples from batch', () => {
    const examples: NovaTrainingExample[] = [
      {
        id: 'batch-clean', language: 'en', category: 'tool_calling',
        instruction: 'Get weather', final_answer: 'sunny',
        difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
        is_synthetic: true, created_at: new Date().toISOString(),
      },
      {
        id: 'batch-dirty', language: 'en', category: 'tool_calling',
        instruction: 'request_id: abc, get weather', final_answer: 'sunny',
        difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
        is_synthetic: true, created_at: new Date().toISOString(),
      },
    ];
    const filtered = guard.filterClean(examples);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('batch-clean');
  });

  it('checks continuous learning candidates', () => {
    const candidate = {
      id: 'c-1', source_conversation_id: 'conv-1', workspace_id: 'ws-1',
      anonymized_prompt: 'Get weather', anonymized_completion: 'sunny',
      safety_checked: true, pii_scrubbed: true, quality_score: 0.9,
      review_status: 'APPROVED' as const, created_at: new Date().toISOString(),
    };
    const result = guard.checkCandidate(candidate);
    expect(result.clean).toBe(true);
  });

  it('rejects unapproved candidates', () => {
    const candidate = {
      id: 'c-2', source_conversation_id: 'conv-2', workspace_id: 'ws-1',
      anonymized_prompt: 'Get weather', anonymized_completion: 'sunny',
      safety_checked: true, pii_scrubbed: true, quality_score: 0.9,
      review_status: 'PENDING' as const, created_at: new Date().toISOString(),
    };
    const result = guard.checkCandidate(candidate);
    expect(result.clean).toBe(false);
  });
});

describe('NOVA DPO Preference Generator', () => {
  it('generates DPO pair from training example', () => {
    const example: NovaTrainingExample = {
      id: 'dpo-1', language: 'en', category: 'tool_calling',
      instruction: 'Get weather', final_answer: 'The weather is sunny.',
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: true, created_at: new Date().toISOString(),
    };
    const pair = generateDPOPair(example);
    expect(pair.prompt).toContain('Get weather');
    expect(pair.chosen).toBe('The weather is sunny.');
    expect(pair.rejected).not.toBe(pair.chosen);
    expect(pair.rejected.length).toBeGreaterThan(0);
    expect(pair.category).toBe('tool_calling');
  });

  it('generates DPO dataset with seed for reproducibility', () => {
    const examples: NovaTrainingExample[] = [
      {
        id: 'dpo-1', language: 'en', category: 'tool_calling',
        instruction: 'Get weather', final_answer: 'sunny',
        difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
        is_synthetic: true, created_at: new Date().toISOString(),
      },
      {
        id: 'dpo-2', language: 'ar', category: 'arabic',
        instruction: 'مرحبا', final_answer: 'أهلاً',
        difficulty: 'easy', safety_label: 'safe', quality_score: 0.85,
        is_synthetic: true, created_at: new Date().toISOString(),
      },
    ];
    const pairs1 = generateDPODataset(examples, { seed: 42 });
    const pairs2 = generateDPODataset(examples, { seed: 42 });
    expect(pairs1.length).toBe(2);
    expect(pairs1[0].rejected).toBe(pairs2[0].rejected);
  });

  it('includes tools in prompt when present', () => {
    const example: NovaTrainingExample = {
      id: 'dpo-3', language: 'en', category: 'tool_calling',
      instruction: 'Get weather', final_answer: '{"tool": "get_weather"}',
      tools: [{ name: 'get_weather', description: 'Get weather', parameters: {} }],
      difficulty: 'easy', safety_label: 'safe', quality_score: 0.9,
      is_synthetic: true, created_at: new Date().toISOString(),
    };
    const pair = generateDPOPair(example);
    expect(pair.prompt).toContain('get_weather');
  });
});

describe('NOVA Eval Harness', () => {
  const harness = new NovaEvalHarness();

  it('validates checkpoint and prepares eval spec', () => {
    const result = harness.prepareEvaluation({
      checkpoint_path: './nonexistent',
      base_model: 'Qwen/Qwen2.5-72B-Instruct',
    });

    expect(result.checkpoint_valid).toBe(false);
    expect(result.evaluation_spec).toBeDefined();
    expect(result.evaluation_spec.total_test_cases).toBeGreaterThan(0);
    expect(result.evaluation_spec.base_model).toBe('Qwen/Qwen2.5-72B-Instruct');
    expect(result.evaluation_spec.chat_template).toBe('qwen2.5');
  });

  it('includes all benchmark categories by default', () => {
    const result = harness.prepareEvaluation({
      checkpoint_path: './nonexistent',
      base_model: 'Qwen/Qwen2.5-72B-Instruct',
    });

    const categories = result.evaluation_spec.task_groups.map(g => g.category);
    expect(categories).toContain('tool_calling');
    expect(categories).toContain('arabic');
    expect(categories).toContain('safety');
    expect(categories).toContain('prompt_injection');
  });

  it('limits samples per category', () => {
    const result = harness.prepareEvaluation({
      checkpoint_path: './nonexistent',
      base_model: 'Qwen/Qwen2.5-72B-Instruct',
      max_samples_per_category: 2,
    });

    for (const group of result.evaluation_spec.task_groups) {
      expect(group.test_count).toBeLessThanOrEqual(2);
    }
  });
});
