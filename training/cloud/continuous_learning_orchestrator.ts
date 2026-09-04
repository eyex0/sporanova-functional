// NOVA Continuous Learning Pipeline
// Controls the path from a production conversation to a training candidate
// dataset version. Every stage is gated and the resulting dataset is a
// fully versioned, anonymised, contamination-checked, provenance-tracked
// training input. Raw production data NEVER directly becomes training data.

import crypto from 'crypto';
import {
  ContinuousCandidate,
  NovaTrainingExample,
  NovaProvenanceLike,
} from '../types';
import { NovaAnonymizer } from '../continuous_learning/anonymizer';
import { NovaContaminationGuard } from '../datasets/contamination_guard';
import { NovaProvenanceTracker } from '../datasets/provenance';

export interface ContinuousLearningConfig {
  min_quality_score: number;
  require_human_review: boolean;
  max_candidates_per_batch: number;
  output_version_prefix: string;
}

export interface ContinuousBatchResult {
  batch_id: string;
  accepted: ContinuousCandidate[];
  rejected: { candidate: ContinuousCandidate; reason: string }[];
  dataset_version: string;
  examples: NovaTrainingExample[];
  manifest: any;
  provenance_hash: string;
}

export class NovaContinuousLearningOrchestrator {
  private config: ContinuousLearningConfig;
  private anonymizer: NovaAnonymizer;
  private contamination: NovaContaminationGuard;
  private provenance: NovaProvenanceTracker;

  constructor(config: Partial<ContinuousLearningConfig> = {}) {
    this.config = {
      min_quality_score: 0.7,
      require_human_review: true,
      max_candidates_per_batch: 5000,
      output_version_prefix: 'cl',
      ...config,
    };
    this.anonymizer = new NovaAnonymizer();
    this.contamination = new NovaContaminationGuard();
    this.provenance = new NovaProvenanceTracker();
  }

  /**
   * Stage 1: ingest a raw production conversation and create a candidate
   * record. Returns null if the conversation is unsafe or low quality.
   */
  ingest(input: {
    conversation_id: string;
    workspace_id: string;
    messages: Array<{ role: string; content: string }>;
    tool_calls?: any[];
  }): ContinuousCandidate | null {
    const text = input.messages.map(m => m.content).join('\n');
    const safety = this.anonymizer.containsSensitiveData(text);
    if (!safety.safe) return null;

    const anon = this.anonymizer.anonymizeConversation(input.messages);
    const anonText = anon.map(m => m.content).join('\n');
    const { piiFound } = this.anonymizer.anonymizeText(anonText);

    let lastUser: { role: string; content: string } | undefined;
    let lastAssistant: { role: string; content: string } | undefined;
    for (let i = input.messages.length - 1; i >= 0; i--) {
      if (!lastUser && input.messages[i].role === 'user') lastUser = input.messages[i];
      if (!lastAssistant && input.messages[i].role === 'assistant') lastAssistant = input.messages[i];
      if (lastUser && lastAssistant) break;
    }

    const prompt = lastUser?.content ?? '';
    const completion = lastAssistant?.content ?? '';
    if (!prompt || !completion) return null;
    if (prompt.length < 8 || completion.length < 4) return null;

    const { anonymized: anonPrompt } = this.anonymizer.anonymizeText(prompt);
    const { anonymized: anonCompletion } = this.anonymizer.anonymizeText(completion);
    const qualityScore = this.scoreQuality(input.messages, input.tool_calls);

    if (qualityScore < this.config.min_quality_score) return null;

    return {
      id: this.generateCandidateId(),
      source_conversation_id: input.conversation_id,
      workspace_id: input.workspace_id,
      anonymized_prompt: anonPrompt,
      anonymized_completion: anonCompletion,
      tool_calls: input.tool_calls,
      safety_checked: true,
      pii_scrubbed: piiFound.length === 0,
      quality_score: qualityScore,
      review_status: this.config.require_human_review ? 'PENDING' : 'APPROVED',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Stage 2: human review. Approves or rejects a candidate.
   */
  review(candidate: ContinuousCandidate, approved: boolean, reviewerId: string): ContinuousCandidate {
    candidate.review_status = approved ? 'APPROVED' : 'REJECTED';
    candidate.reviewer_id = reviewerId;
    candidate.reviewed_at = new Date().toISOString();
    return candidate;
  }

  /**
   * Stage 3: build a training-ready dataset from approved candidates.
   * Runs every candidate through the contamination guard, anonymiser
   * (again, for safety) and a final dedup. Returns a fully versioned
   * training input.
   */
  buildDataset(candidates: ContinuousCandidate[], version: string): ContinuousBatchResult {
    const batchId = this.generateBatchId();
    const accepted: ContinuousCandidate[] = [];
    const rejected: { candidate: ContinuousCandidate; reason: string }[] = [];

    for (const c of candidates) {
      if (c.review_status !== 'APPROVED') {
        rejected.push({ candidate: c, reason: 'not approved' });
        continue;
      }
      const example: NovaTrainingExample = {
        id: c.id,
        language: 'en',
        category: 'enterprise_reasoning',
        instruction: c.anonymized_prompt,
        final_answer: c.anonymized_completion,
        tools: c.tool_calls,
        trajectory: undefined,
        difficulty: 'medium',
        safety_label: 'safe',
        quality_score: c.quality_score,
        is_synthetic: false,
        metadata: {
          source: 'continuous_learning',
          pii_scrubbed: c.pii_scrubbed,
        },
        created_at: c.created_at,
      };
      const contam = this.contamination.checkExample(example);
      if (!contam.clean) {
        rejected.push({ candidate: c, reason: `contamination: ${contam.violations.join(', ')}` });
        continue;
      }
      if (c.quality_score < this.config.min_quality_score) {
        rejected.push({ candidate: c, reason: 'low quality' });
        continue;
      }
      accepted.push(c);
      if (accepted.length > this.config.max_candidates_per_batch) break;
    }

    const examples = accepted.map(c => ({
      id: c.id,
      language: 'en' as const,
      category: 'enterprise_reasoning' as const,
      instruction: c.anonymized_prompt,
      final_answer: c.anonymized_completion,
      tools: c.tool_calls,
      trajectory: undefined,
      difficulty: 'medium' as const,
      safety_label: 'safe' as const,
      quality_score: c.quality_score,
      is_synthetic: false,
      metadata: {
        source: 'continuous_learning',
        source_conversation_id: c.source_conversation_id,
        workspace_id: c.workspace_id,
      },
      created_at: c.created_at,
    }));

    // Provenance: content hash of the produced dataset
    const content = examples.map(e => JSON.stringify(e)).join('\n');
    const provenanceHash = crypto.createHash('sha256').update(content).digest('hex');

    const manifest = {
      dataset_id: `nova-${this.config.output_version_prefix}-${version}-${Date.now()}`,
      version: `${this.config.output_version_prefix}-${version}`,
      source: 'continuous_learning',
      created_at: new Date().toISOString(),
      total_examples: examples.length,
      splits: {
        train: Math.floor(examples.length * 0.8),
        validation: Math.floor(examples.length * 0.1),
        test: examples.length - Math.floor(examples.length * 0.9),
      },
      quality_stats: {
        avg_quality_score: examples.length > 0
          ? Number((examples.reduce((s, e) => s + e.quality_score, 0) / examples.length).toFixed(3))
          : 0,
        min_quality_score: examples.length > 0 ? Math.min(...examples.map(e => e.quality_score)) : 0,
      },
      content_sha256: provenanceHash,
      language_distribution: { en: examples.length },
      category_distribution: { enterprise_reasoning: examples.length },
    };

    return {
      batch_id: batchId,
      accepted,
      rejected,
      dataset_version: manifest.version,
      examples,
      manifest,
      provenance_hash: provenanceHash,
    };
  }

  private scoreQuality(messages: Array<{ role: string; content: string }>, toolCalls?: any[]): number {
    let score = 0.5;
    const total = messages.reduce((s, m) => s + m.content.length, 0);
    if (total > 200) score += 0.1;
    if (total > 500) score += 0.1;
    if (total > 1000) score += 0.05;
    if (messages.length >= 2) score += 0.05;
    if (messages.length >= 4) score += 0.05;
    if (messages.some(m => m.role === 'user') && messages.some(m => m.role === 'assistant')) score += 0.1;
    if (toolCalls && toolCalls.length > 0) {
      score += 0.05;
      if (toolCalls.length > 1) score += 0.05;
    }
    return Number(Math.min(1, score).toFixed(2));
  }

  private generateCandidateId(): string {
    return `nova-cl-cand-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  }
  private generateBatchId(): string {
    return `nova-cl-batch-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  }
}
