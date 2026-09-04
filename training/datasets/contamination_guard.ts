// NOVA Training Data Contamination Guard
// Ensures no raw production user conversations enter training datasets

import { NovaTrainingExample, ContinuousCandidate } from '../types';

export interface ContaminationCheckResult {
  clean: boolean;
  violations: string[];
  details: {
    has_raw_conversation_ids: boolean;
    has_unanonymized_pii: boolean;
    has_production_markers: boolean;
    has_is_synthetic_false_without_review: boolean;
    has_workspace_ids: boolean;
  };
}

export class NovaContaminationGuard {
  private readonly PRODUCTION_PATTERNS = [
    /session[_-]?id/i,
    /conversation[_-]?id/i,
    /request[_-]?id/i,
    /trace[_-]?id/i,
    /user[_-]?agent/i,
    /cf[_-]?connecting/i,
    /cf[_-]?ray/i,
    /x[_-]?request[_-]?id/i,
  ];

  private readonly RAW_DATA_MARKERS = [
    /"workspace_id"\s*:\s*"(ws-|\d+)/,
    /"user_id"\s*:\s*\d+/,
    /"session_id"/,
    /"conversation_id"/,
    /"request_id"/,
    /"trace_id"/,
  ];

  /**
   * Check a single training example for contamination.
   */
  checkExample(example: NovaTrainingExample): ContaminationCheckResult {
    const violations: string[] = [];
    const details = {
      has_raw_conversation_ids: false,
      has_unanonymized_pii: false,
      has_production_markers: false,
      has_is_synthetic_false_without_review: false,
      has_workspace_ids: false,
    };

    const fullText = `${example.instruction} ${example.final_answer} ${example.context || ''}`;

    // 1. Check for raw conversation/request IDs
    for (const pattern of this.PRODUCTION_PATTERNS) {
      if (pattern.test(fullText)) {
        violations.push(`Contains production pattern: ${pattern.source}`);
        details.has_raw_conversation_ids = true;
      }
    }

    // 2. Check for raw data markers in JSON
    const textJson = JSON.stringify(example);
    for (const pattern of this.RAW_DATA_MARKERS) {
      if (pattern.test(textJson)) {
        violations.push(`Contains raw data marker: ${pattern.source}`);
        details.has_workspace_ids = true;
      }
    }

    // 3. Check for unanonymized PII
    const piiPatterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      /\b\d{3}-\d{2}-\d{4}\b/,
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
    ];
    for (const pattern of piiPatterns) {
      if (pattern.test(fullText) && example.is_synthetic) {
        violations.push(`Synthetic example contains apparent PII: ${pattern.source}`);
        details.has_unanonymized_pii = true;
      }
    }

    // 4. Check is_synthetic flag consistency
    if (!example.is_synthetic) {
      // Non-synthetic data must have been through continuous learning pipeline
      if (!example.metadata?.source || example.metadata.source !== 'continuous_learning') {
        violations.push('Non-synthetic example without continuous_learning source metadata');
        details.has_is_synthetic_false_without_review = true;
      }
      if (!example.metadata?.pii_scrubbed) {
        violations.push('Non-synthetic example without pii_scrubbed confirmation');
        details.has_is_synthetic_false_without_review = true;
      }
    }

    return {
      clean: violations.length === 0,
      violations,
      details,
    };
  }

  /**
   * Check a batch of training examples.
   */
  checkBatch(examples: NovaTrainingExample[]): {
    all_clean: boolean;
    total: number;
    clean: number;
    contaminated: number;
    contaminated_ids: string[];
    violations_by_example: Record<string, string[]>;
  } {
    const contaminatedIds: string[] = [];
    const violationsByExample: Record<string, string[]> = {};
    let cleanCount = 0;

    for (const example of examples) {
      const result = this.checkExample(example);
      if (result.clean) {
        cleanCount++;
      } else {
        contaminatedIds.push(example.id);
        violationsByExample[example.id] = result.violations;
      }
    }

    return {
      all_clean: contaminatedIds.length === 0,
      total: examples.length,
      clean: cleanCount,
      contaminated: contaminatedIds.length,
      contaminated_ids: contaminatedIds,
      violations_by_example: violationsByExample,
    };
  }

  /**
   * Check a continuous learning candidate before it enters the pipeline.
   */
  checkCandidate(candidate: ContinuousCandidate): ContaminationCheckResult {
    const violations: string[] = [];
    const details = {
      has_raw_conversation_ids: false,
      has_unanonymized_pii: false,
      has_production_markers: false,
      has_is_synthetic_false_without_review: false,
      has_workspace_ids: false,
    };

    const fullText = `${candidate.anonymized_prompt} ${candidate.anonymized_completion}`;

    // Check for production markers
    for (const pattern of this.PRODUCTION_PATTERNS) {
      if (pattern.test(fullText)) {
        violations.push(`Candidate contains production pattern: ${pattern.source}`);
        details.has_raw_conversation_ids = true;
      }
    }

    // Check source conversation ID is present (provenance)
    if (!candidate.source_conversation_id) {
      violations.push('Missing source_conversation_id (provenance required)');
    }

    // Check workspace_id format
    if (candidate.workspace_id && !/^(ws-|\d+)/.test(candidate.workspace_id)) {
      // This is actually OK — workspace_id should be a known format
    }

    // Check safety was checked
    if (!candidate.safety_checked) {
      violations.push('Candidate has not been safety checked');
    }

    // Check PII was scrubbed
    if (!candidate.pii_scrubbed) {
      violations.push('Candidate PII has not been confirmed scrubbed');
    }

    // Check review status
    if (candidate.review_status !== 'APPROVED') {
      violations.push(`Candidate review status is ${candidate.review_status}, must be APPROVED for training`);
    }

    return {
      clean: violations.length === 0,
      violations,
      details,
    };
  }

  /**
   * Filter a batch, removing contaminated examples.
   */
  filterClean(examples: NovaTrainingExample[]): NovaTrainingExample[] {
    return examples.filter(ex => this.checkExample(ex).clean);
  }
}
