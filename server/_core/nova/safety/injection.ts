// NOVA Prompt Injection Detection
// SOPRANOVA Intelligence Platform

export interface InjectionCheckResult {
  detected: boolean;
  confidence: number;
  reason?: string;
}

export class NovaInjectionDetector {
  private patterns: RegExp[] = [
    /ignore (previous|all|above) instructions?/i,
    /you are now/i,
    /disregard.*instructions?/i,
    /new instructions?:/i,
    /system\s*:/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
  ];

  detect(input: string): InjectionCheckResult {
    for (const pattern of this.patterns) {
      if (pattern.test(input)) {
        return {
          detected: true,
          confidence: 0.85,
          reason: `Matched injection pattern: ${pattern.source}`,
        };
      }
    }

    return { detected: false, confidence: 0 };
  }
}
