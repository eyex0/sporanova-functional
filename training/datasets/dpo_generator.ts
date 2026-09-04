// NOVA DPO Preference Dataset Generator
// Generates preference pairs from SFT training examples
// chosen = correct response, rejected = degraded/incorrect response

import { NovaTrainingExample } from '../types';

export interface DPOPreferencePair {
  prompt: string;
  chosen: string;
  rejected: string;
  category: string;
  difficulty: string;
  language: string;
  metadata?: Record<string, any>;
}

/**
 * Degradation strategies for generating rejected responses.
 */
function degradeResponse(response: string, strategy: string): string {
  switch (strategy) {
    case 'truncate':
      // Cut the response at 40% length
      const cutoff = Math.floor(response.length * 0.4);
      return response.slice(0, cutoff) + '...';

    case 'wrong_answer':
      // Replace key parts with incorrect info
      return response
        .replace(/\d+/g, '0')
        .replace(/yes/gi, 'no')
        .replace(/correct/gi, 'incorrect')
        .replace(/increase/gi, 'decrease');

    case 'refuse':
      return "I'm not sure about that. I can't help with this request.";

    case 'hallucinate':
      return `Based on my knowledge, the answer is completely different. ${response.slice(0, 50)}... Actually, I believe the opposite is true.`;

    case 'off_topic':
      return "Let me tell you about the weather today. It's sunny with a high of 25°C.";

    case 'incomplete':
      // Keep first sentence only
      const firstSentence = response.split(/[.!?]\s/)[0];
      return firstSentence ? firstSentence + '.' : response.slice(0, 50);

    default:
      return response;
  }
}

const DEGRADATION_STRATEGIES = [
  'truncate',
  'wrong_answer',
  'refuse',
  'hallucinate',
  'off_topic',
  'incomplete',
];

function pickStrategy(): string {
  return DEGRADATION_STRATEGIES[Math.floor(Math.random() * DEGRADATION_STRATEGIES.length)];
}

/**
 * Convert NovaTrainingExample to DPO preference pair format.
 */
export function generateDPOPair(example: NovaTrainingExample): DPOPreferencePair {
  const strategy = pickStrategy();
  const rejected = degradeResponse(example.final_answer, strategy);

  // Build prompt in ChatML user-message style
  let prompt = example.instruction;
  if (example.context) {
    prompt += `\n\nContext: ${example.context}`;
  }
  if (example.tools && example.tools.length > 0) {
    prompt += `\n\nAvailable tools: ${JSON.stringify(example.tools)}`;
  }

  return {
    prompt,
    chosen: example.final_answer,
    rejected,
    category: example.category,
    difficulty: example.difficulty,
    language: example.language,
    metadata: {
      degradation_strategy: strategy,
      is_synthetic: example.is_synthetic,
      original_id: example.id,
      quality_score: example.quality_score,
    },
  };
}

/**
 * Generate a DPO preference dataset from SFT examples.
 */
export function generateDPODataset(
  examples: NovaTrainingExample[],
  options: { seed?: number } = {}
): DPOPreferencePair[] {
  if (options.seed !== undefined) {
    // Simple seeded random for reproducibility
    let s = options.seed;
    const origRandom = Math.random;
    Math.random = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    const pairs = examples.map(generateDPOPair);
    Math.random = origRandom;
    return pairs;
  }

  return examples.map(generateDPOPair);
}

/**
 * Write DPO pairs to JSONL format compatible with TRL DPO Trainer.
 */
export function writeDPOJsonl(pairs: DPOPreferencePair[], filePath: string): void {
  const fs = require('fs');
  const dir = require('path').dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const lines = pairs.map(p => JSON.stringify({
    prompt: p.prompt,
    chosen: p.chosen,
    rejected: p.rejected,
  })).join('\n');
  fs.writeFileSync(filePath, lines, 'utf-8');
}
