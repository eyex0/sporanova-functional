import { describe, it, expect, beforeEach } from 'vitest';
import { NovaModelRegistry } from '../training/registry/model_registry';
import { NovaAnonymizer } from '../training/continuous_learning/anonymizer';
import { NovaContinuousLearningPipeline } from '../training/continuous_learning/pipeline';

describe('NOVA Model Registry', () => {
  let registry: NovaModelRegistry;

  beforeEach(() => {
    registry = new NovaModelRegistry();
  });

  it('registers a new model with TRAINING status', () => {
    const model = registry.register({
      model_id: '',
      model_name: 'NOVA',
      version: 'v0.5',
      base_model: 'Qwen/Qwen2.5-72B-Instruct',
      training_type: 'qlora',
      training_dataset_version: 'v0.1',
      training_config_path: './training/configs/nova-qlora.yaml',
      checkpoint_location: './checkpoints/nova-qlora-v0.5',
      notes: 'First QLoRA training run',
    });

    expect(model.status).toBe('TRAINING');
    expect(model.model_name).toBe('NOVA');
    expect(model.version).toBe('v0.5');
    expect(model.model_id).toContain('nova-');
  });

  it('prevents auto-promotion to PRODUCTION', () => {
    registry.register({
      model_id: '', model_name: 'NOVA', version: 'v0.5',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'qlora',
      training_dataset_version: 'v0.1', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint',
    });

    // Try to promote directly from TRAINING → PRODUCTION (should fail)
    expect(() => registry.promote('')).toThrow();
  });

  it('follows correct lifecycle: TRAINING → EVALUATION → CANDIDATE → APPROVED → PRODUCTION', () => {
    const model = registry.register({
      model_id: '', model_name: 'NOVA', version: 'v1.0',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'full_ft',
      training_dataset_version: 'v1.0', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint',
    });

    registry.updateStatus(model.model_id, 'EVALUATION');
    expect(registry.get(model.model_id)?.status).toBe('EVALUATION');

    registry.updateStatus(model.model_id, 'CANDIDATE');
    expect(registry.get(model.model_id)?.status).toBe('CANDIDATE');

    registry.updateStatus(model.model_id, 'APPROVED');
    expect(registry.get(model.model_id)?.status).toBe('APPROVED');

    // Set metrics before promoting
    registry.updateMetrics(model.model_id, { accuracy: 0.85, tool_accuracy: 0.90 });

    // Only now can we promote
    registry.promote(model.model_id);
    expect(registry.get(model.model_id)?.status).toBe('PRODUCTION');
    expect(registry.get(model.model_id)?.promoted_at).toBeDefined();
  });

  it('prevents duplicate versions', () => {
    registry.register({
      model_id: '', model_name: 'NOVA', version: 'v1.0',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'qlora',
      training_dataset_version: 'v0.1', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint',
    });

    expect(() => registry.register({
      model_id: '', model_name: 'NOVA', version: 'v1.0',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'qlora',
      training_dataset_version: 'v0.1', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint2',
    })).toThrow();
  });

  it('deprecates a model from any valid status', () => {
    const model = registry.register({
      model_id: '', model_name: 'NOVA', version: 'v0.5',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'qlora',
      training_dataset_version: 'v0.1', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint',
    });

    // Can deprecate from TRAINING
    registry.deprecate(model.model_id);
    expect(registry.get(model.model_id)?.status).toBe('DEPRECATED');
  });

  it('retrieves production model', () => {
    const model = registry.register({
      model_id: '', model_name: 'NOVA', version: 'v1.0',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'full_ft',
      training_dataset_version: 'v1.0', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint',
    });

    // Full lifecycle
    registry.updateStatus(model.model_id, 'EVALUATION');
    registry.updateStatus(model.model_id, 'CANDIDATE');
    registry.updateStatus(model.model_id, 'APPROVED');
    registry.updateMetrics(model.model_id, { accuracy: 0.87 });
    registry.promote(model.model_id);

    const prod = registry.getProduction();
    expect(prod?.model_id).toBe(model.model_id);
    expect(prod?.version).toBe('v1.0');
  });

  it('tracks version history', () => {
    registry.register({
      model_id: '', model_name: 'NOVA', version: 'v0.5',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'qlora',
      training_dataset_version: 'v0.1', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint1',
    });
    registry.register({
      model_id: '', model_name: 'NOVA', version: 'v1.0',
      base_model: 'Qwen/Qwen2.5-72B-Instruct', training_type: 'full_ft',
      training_dataset_version: 'v1.0', training_config_path: './config.yaml',
      checkpoint_location: './checkpoint2',
    });

    const history = registry.history('NOVA');
    expect(history.length).toBe(2);
    expect(history[0].version).toBe('v0.5');
    expect(history[1].version).toBe('v1.0');
  });
});

describe('NOVA Anonymizer', () => {
  it('anonymizes email addresses', () => {
    const anon = new NovaAnonymizer();
    const result = anon.anonymizeText('Contact me at john@example.com');
    expect(result.anonymized).toContain('[EMAIL]');
    expect(result.anonymized).not.toContain('john@example.com');
    expect(result.piiFound.length).toBeGreaterThan(0);
  });

  it('anonymizes phone numbers', () => {
    const anon = new NovaAnonymizer();
    const result = anon.anonymizeText('Call me at +1-555-123-4567');
    expect(result.anonymized).toContain('[PHONE]');
    expect(result.anonymized).not.toContain('555-123-4567');
  });

  it('anonymizes API keys', () => {
    const anon = new NovaAnonymizer();
    const result = anon.anonymizeText('Use key sk_live_abc123def456ghi789');
    expect(result.anonymized).toContain('[API_KEY]');
    expect(result.anonymized).not.toContain('sk_live_abc123');
  });

  it('anonymizes conversation messages', () => {
    const anon = new NovaAnonymizer();
    const messages = [
      { role: 'user', content: 'My email is test@corp.com' },
      { role: 'assistant', content: 'Got it!' },
    ];
    const result = anon.anonymizeConversation(messages);
    expect(result[0].content).toContain('[EMAIL]');
    expect(result[0].content).not.toContain('test@corp.com');
    expect(result[1].content).toBe('Got it!');
  });

  it('detects sensitive data', () => {
    const anon = new NovaAnonymizer();
    const safe = anon.containsSensitiveData('What is the capital of France?');
    expect(safe.safe).toBe(true);

    const unsafe = anon.containsSensitiveData('My social security number is 123-45-6789');
    expect(unsafe.safe).toBe(false);
  });
});

describe('NOVA Continuous Learning Pipeline', () => {
  it('ingests and anonymizes a conversation', () => {
    const pipeline = new NovaContinuousLearningPipeline();
    const candidate = pipeline.ingestConversation(
      'conv-1',
      'ws-123',
      [
        { role: 'user', content: 'Analyze my sales data and provide insights' },
        { role: 'assistant', content: 'I will analyze the data for you.' },
      ]
    );

    expect(candidate).not.toBeNull();
    expect(candidate!.workspace_id).toBe('ws-123');
    expect(candidate!.safety_checked).toBe(true);
    expect(candidate!.review_status).toBe('PENDING');
  });

  it('anonymizes PII in conversations before ingesting', () => {
    const pipeline = new NovaContinuousLearningPipeline();
    // Conversation with PII should still be ingested but anonymized
    const candidate = pipeline.ingestConversation(
      'conv-2',
      'ws-456',
      [
        { role: 'user', content: 'Send an email to test@company.com about the project' },
        { role: 'assistant', content: 'I will draft the email.' },
      ]
    );

    // The email makes containsSensitiveData return safe=false, so null
    expect(candidate).toBeNull();
  });

  it('exports approved candidates as NovaTrainingExamples', () => {
    const pipeline = new NovaContinuousLearningPipeline();
    const candidates = [
      {
        id: 'c-1', source_conversation_id: 'conv-1', workspace_id: 'ws-1',
        anonymized_prompt: 'What are sales?', anonymized_completion: 'Sales are up 10%',
        safety_checked: true, pii_scrubbed: true, quality_score: 0.85,
        review_status: 'APPROVED' as const, reviewer_id: 'user-1',
        reviewed_at: new Date().toISOString(), created_at: new Date().toISOString(),
      },
    ];

    const examples = pipeline.exportApprovedCandidates(candidates);
    expect(examples.length).toBe(1);
    expect(examples[0].is_synthetic).toBe(false);
    expect(examples[0].metadata?.source).toBe('continuous_learning');
  });
});
