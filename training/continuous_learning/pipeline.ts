import crypto from 'crypto';
import { ContinuousCandidate, NovaTrainingExample } from '../types';
import { NovaAnonymizer } from './anonymizer';

const anonymizer = new NovaAnonymizer();

function generateId(): string {
  const ts = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);
  return `nova-cl-${ts}-${rand}`;
}

function calculateQualityScore(messages: Array<{ role: string; content: string }>, toolCalls?: any[]): number {
  let score = 0.5;

  const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalLength > 200) score += 0.1;
  if (totalLength > 500) score += 0.1;
  if (totalLength > 1000) score += 0.05;

  if (messages.length >= 2) score += 0.05;
  if (messages.length >= 4) score += 0.05;

  const hasUser = messages.some(m => m.role === 'user');
  const hasAssistant = messages.some(m => m.role === 'assistant');
  if (hasUser && hasAssistant) score += 0.1;

  if (toolCalls && toolCalls.length > 0) {
    score += 0.05;
    if (toolCalls.length > 1) score += 0.05;
  }

  return Math.min(1.0, Number(score.toFixed(2)));
}

export class NovaContinuousLearningPipeline {
  ingestConversation(
    conversationId: string,
    workspaceId: string,
    messages: Array<{ role: string; content: string }>,
    toolCalls?: any[]
  ): ContinuousCandidate | null {
    const safetyCheck = anonymizer.containsSensitiveData(
      messages.map(m => m.content).join('\n')
    );
    if (!safetyCheck.safe) {
      return null;
    }

    const anonymizedConversation = anonymizer.anonymizeConversation(messages);
    const anonymizedText = anonymizedConversation.map(m => m.content).join('\n');
    const { piiFound } = anonymizer.anonymizeText(anonymizedText);

    let lastUser: { role: string; content: string } | undefined;
    let lastAssistant: { role: string; content: string } | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!lastUser && messages[i].role === 'user') lastUser = messages[i];
      if (!lastAssistant && messages[i].role === 'assistant') lastAssistant = messages[i];
      if (lastUser && lastAssistant) break;
    }

    const prompt = lastUser?.content ?? '';
    const completion = lastAssistant?.content ?? '';

    const { anonymized: anonPrompt } = anonymizer.anonymizeText(prompt);
    const { anonymized: anonCompletion } = anonymizer.anonymizeText(completion);

    const qualityScore = calculateQualityScore(messages, toolCalls);

    return {
      id: generateId(),
      source_conversation_id: conversationId,
      workspace_id: workspaceId,
      anonymized_prompt: anonPrompt,
      anonymized_completion: anonCompletion,
      tool_calls: toolCalls,
      safety_checked: true,
      pii_scrubbed: piiFound.length === 0,
      quality_score: qualityScore,
      review_status: 'PENDING',
      created_at: new Date().toISOString(),
    };
  }

  reviewCandidate(candidateId: string, approved: boolean, reviewerId: string): void {
    const status = approved ? 'APPROVED' : 'REJECTED';
    console.log(`Candidate ${candidateId} ${status} by ${reviewerId}`);
  }

  exportApprovedCandidates(candidates: ContinuousCandidate[]): NovaTrainingExample[] {
    return candidates
      .filter(c => c.review_status === 'APPROVED')
      .map(c => ({
        id: c.id,
        language: 'en' as const,
        category: 'enterprise_reasoning' as const,
        instruction: c.anonymized_prompt,
        final_answer: c.anonymized_completion,
        tools: undefined,
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
  }

  packageDataset(
    examples: NovaTrainingExample[],
    version: string
  ): { examples: NovaTrainingExample[]; manifest: any } {
    const totalQuality = examples.reduce((sum, e) => sum + e.quality_score, 0);
    const avgQuality = examples.length > 0
      ? Number((totalQuality / examples.length).toFixed(3))
      : 0;

    const langDist: Record<string, number> = {};
    const catDist: Record<string, number> = {};
    for (const ex of examples) {
      langDist[ex.language] = (langDist[ex.language] || 0) + 1;
      catDist[ex.category] = (catDist[ex.category] || 0) + 1;
    }

    const manifest = {
      dataset_id: `nova-cl-${version}-${Date.now()}`,
      version,
      source: 'continuous_learning' as const,
      created_at: new Date().toISOString(),
      total_examples: examples.length,
      splits: {
        train: Math.floor(examples.length * 0.8),
        validation: Math.floor(examples.length * 0.1),
        test: examples.length - Math.floor(examples.length * 0.8) - Math.floor(examples.length * 0.1),
      },
      quality_stats: {
        avg_quality_score: avgQuality,
        min_quality_score: examples.length > 0
          ? Math.min(...examples.map(e => e.quality_score))
          : 0,
      },
      language_distribution: langDist,
      category_distribution: catDist,
    };

    return { examples, manifest };
  }
}
