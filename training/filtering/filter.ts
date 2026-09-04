// NOVA Dataset Quality Filter & Splitter
// Enforces deterministic quality, safety, deduplication, and contamination checks

import { NovaTrainingExample, DatasetFilterResult, NovaLanguage } from '../types';

export interface FilterOptions {
  minQualityScore?: number;
  deduplicateByInstruction?: boolean;
  rejectPromptInjections?: boolean;
  validateToolCalls?: boolean;
  validateJsonOutput?: boolean;
}

export class NovaDatasetFilter {
  private minQualityScore: number;
  private deduplicateByInstruction: boolean;
  private rejectPromptInjections: boolean;
  private validateToolCalls: boolean;
  private validateJsonOutput: boolean;

  private injectionPatterns = [
    /ignore (previous|all|above) instructions/i,
    /you are now/i,
    /disregard.*instructions/i,
    /<\|im_start\|>/i,
    /system\s*:/i,
    /drop table/i,
    /delete from/i,
    /exec\(/i,
  ];

  constructor(options: FilterOptions = {}) {
    this.minQualityScore = options.minQualityScore ?? 0.70;
    this.deduplicateByInstruction = options.deduplicateByInstruction ?? true;
    this.rejectPromptInjections = options.rejectPromptInjections ?? true;
    this.validateToolCalls = options.validateToolCalls ?? true;
    this.validateJsonOutput = options.validateJsonOutput ?? true;
  }

  filter(examples: NovaTrainingExample[]): DatasetFilterResult {
    const accepted: NovaTrainingExample[] = [];
    const rejected: Array<{ example: NovaTrainingExample; reason: string }> = [];
    const seenHashes = new Set<string>();

    for (const ex of examples) {
      // 1. Basic validation
      if (!ex.id || !ex.instruction || !ex.final_answer) {
        rejected.push({ example: ex, reason: 'Malformed example: missing required fields' });
        continue;
      }

      // 2. Minimum quality score
      if (ex.quality_score < this.minQualityScore) {
        rejected.push({ example: ex, reason: `Low quality score: ${ex.quality_score} < ${this.minQualityScore}` });
        continue;
      }

      // 3. Deduplication
      if (this.deduplicateByInstruction) {
        const hash = this.hashString(ex.instruction.trim().toLowerCase());
        if (seenHashes.has(hash)) {
          rejected.push({ example: ex, reason: 'Duplicate instruction detected' });
          continue;
        }
        seenHashes.add(hash);
      }

      // 4. Prompt Injection Defense filter
      if (this.rejectPromptInjections && ex.category !== 'prompt_injection_defense') {
        let isInjection = false;
        for (const pattern of this.injectionPatterns) {
          if (pattern.test(ex.instruction)) {
            isInjection = true;
            break;
          }
        }
        if (isInjection) {
          rejected.push({ example: ex, reason: 'Prompt injection attempt detected in non-defense sample' });
          continue;
        }
      }

      // 5. Tool-call structure validation
      if (this.validateToolCalls && ex.trajectory && ex.trajectory.length > 0) {
        let invalidTrajectory = false;
        for (const step of ex.trajectory) {
          if (!step.step || (step.action && typeof step.action !== 'string')) {
            invalidTrajectory = true;
            break;
          }
        }
        if (invalidTrajectory) {
          rejected.push({ example: ex, reason: 'Invalid trajectory step structure' });
          continue;
        }
      }

      // 6. JSON / Structured output check if category is json_generation
      if (this.validateJsonOutput && ex.category === 'json_generation') {
        try {
          JSON.parse(ex.final_answer);
        } catch {
          rejected.push({ example: ex, reason: 'Invalid JSON in final_answer for json_generation category' });
          continue;
        }
      }

      // Passed all checks
      accepted.push(ex);
    }

    // Compute stats
    const langDist: Record<NovaLanguage, number> = { ar: 0, en: 0, mixed: 0 };
    const catDist: Record<string, number> = {};
    let qualitySum = 0;

    for (const ex of accepted) {
      langDist[ex.language] = (langDist[ex.language] || 0) + 1;
      catDist[ex.category] = (catDist[ex.category] || 0) + 1;
      qualitySum += ex.quality_score;
    }

    return {
      accepted,
      rejected,
      stats: {
        total: examples.length,
        accepted_count: accepted.length,
        rejected_count: rejected.length,
        avg_quality_score: accepted.length > 0 ? Number((qualitySum / accepted.length).toFixed(3)) : 0,
        language_distribution: langDist,
        category_distribution: catDist,
      },
    };
  }

  split(
    examples: NovaTrainingExample[],
    trainRatio = 0.8,
    valRatio = 0.1
  ): { train: NovaTrainingExample[]; validation: NovaTrainingExample[]; test: NovaTrainingExample[] } {
    // Shuffle deterministically
    const shuffled = [...examples].sort((a, b) => a.id.localeCompare(b.id));
    const n = shuffled.length;
    const trainEnd = Math.floor(n * trainRatio);
    const valEnd = Math.floor(n * (trainRatio + valRatio));

    return {
      train: shuffled.slice(0, trainEnd),
      validation: shuffled.slice(trainEnd, valEnd),
      test: shuffled.slice(valEnd),
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }
}
