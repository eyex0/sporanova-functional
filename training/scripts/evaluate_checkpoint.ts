#!/usr/bin/env npx tsx
// NOVA Checkpoint Evaluation Script
// Run: npx tsx training/scripts/evaluate_checkpoint.ts --checkpoint ./checkpoints/nova-qlora-v0.1

import { NovaCheckpointValidator } from '../registry/checkpoint_validator';
import { NovaEvalHarness } from '../evaluation/eval_harness';

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] || '';
      i++;
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv);

  const checkpointPath = args.checkpoint || './checkpoints/nova-qlora-v0.1';
  const baseModel = args['base-model'] || 'Qwen/Qwen2.5-72B-Instruct';
  const outputDir = args.output || './evaluation/results';

  console.log('=== NOVA Checkpoint Evaluation ===\n');
  console.log(`Checkpoint: ${checkpointPath}`);
  console.log(`Base model: ${baseModel}\n`);

  // Step 1: Validate checkpoint
  console.log('[1/3] Validating checkpoint...');
  const validator = new NovaCheckpointValidator();
  const validation = validator.validate(checkpointPath);

  console.log(`  Valid: ${validation.valid}`);
  console.log(`  Artifacts: ${validation.artifacts.join(', ')}`);
  if (validation.errors.length > 0) {
    console.log(`  Errors: ${validation.errors.join('; ')}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`  Warnings: ${validation.warnings.join('; ')}`);
  }
  if (validation.sha256) {
    console.log(`  Adapter SHA-256: ${validation.sha256}`);
  }
  console.log(`  Adapter size: ${(validation.adapter_size_bytes / 1024 / 1024).toFixed(1)} MB`);
  console.log();

  if (!validation.valid) {
    console.error('Checkpoint validation FAILED. Cannot proceed with evaluation.');
    process.exit(1);
  }

  // Step 2: Prepare evaluation spec
  console.log('[2/3] Preparing evaluation specification...');
  const harness = new NovaEvalHarness();
  const { evaluation_spec } = harness.prepareEvaluation({
    checkpoint_path: checkpointPath,
    base_model: baseModel,
  });

  console.log(`  Total test cases: ${evaluation_spec.total_test_cases}`);
  console.log(`  Categories: ${evaluation_spec.task_groups.map(g => g.category).join(', ')}`);
  console.log(`  Timeout: ${evaluation_spec.timeout_seconds}s`);
  console.log();

  // Step 3: Save evaluation spec
  console.log('[3/3] Saving evaluation specification...');
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const specPath = path.join(outputDir, `eval_spec_${Date.now()}.json`);
  fs.writeFileSync(specPath, JSON.stringify(evaluation_spec, null, 2));

  const validationPath = path.join(outputDir, `checkpoint_validation_${Date.now()}.json`);
  fs.writeFileSync(validationPath, JSON.stringify(validation, null, 2));

  console.log(`  Eval spec saved to: ${specPath}`);
  console.log(`  Validation saved to: ${validationPath}`);

  console.log('\n=== Next Steps ===');
  console.log('1. Copy the evaluation spec to a GPU machine');
  console.log('2. Run the evaluation script on GPU:');
  console.log('   python training/scripts/run_gpu_eval.py --spec <eval_spec_path>');
  console.log('3. Ingest results:');
  console.log('   npx tsx training/scripts/ingest_eval_results.ts --results <results_path>');
}

main().catch(console.error);
