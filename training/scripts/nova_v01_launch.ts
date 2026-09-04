#!/usr/bin/env npx tsx
// NOVA v0.1 — First Dataset Generation, Benchmark & Model Registration
// Run: npx tsx training/scripts/nova_v01_launch.ts

import * as fs from 'fs';
import * as path from 'path';
import { NovaDatasetGenerator } from '../generation/generator';
import { NovaDatasetFilter } from '../filtering/filter';
import { NovaDatasetManifest } from '../datasets/manifest';
import { NovaBenchmarkRunner, NovaComparisonReport } from '../evaluation/benchmark';
import { NOVA_BENCHMARK_TEST_CASES } from '../evaluation/test_cases';
import { NovaModelRegistry } from '../registry/model_registry';

const OUTPUT_DIR = path.resolve(process.cwd(), 'training', 'datasets', 'v0.1');
const REGISTRY_PATH = path.resolve(process.cwd(), 'training', 'registry', 'registry.json');
const REPORT_DIR = path.resolve(process.cwd(), 'training', 'evaluation', 'results');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  console.log('=== NOVA v0.1 Launch Pipeline ===\n');

  // ─── PHASE 1: Generate Dataset ───────────────────────────────────
  console.log('[1/5] Generating NOVA v0.1 dataset...');

  const generator = new NovaDatasetGenerator();
  const allExamples = generator.generateAll(5); // 5 per category = ~100 examples
  console.log(`  Generated ${allExamples.length} examples across 20 categories`);

  // ─── PHASE 2: Filter & Quality Check ─────────────────────────────
  console.log('[2/5] Running quality filters...');

  const filter = new NovaDatasetFilter({ minQualityScore: 0.70 });
  const filterResult = filter.filter(allExamples);
  console.log(`  Accepted: ${filterResult.stats.accepted_count}/${filterResult.stats.total}`);
  console.log(`  Rejected: ${filterResult.stats.rejected_count}`);
  console.log(`  Avg quality: ${filterResult.stats.avg_quality_score}`);
  console.log(`  Languages:`, filterResult.stats.language_distribution);
  console.log(`  Categories:`, Object.keys(filterResult.stats.category_distribution).length);

  // ─── PHASE 3: Split & Create Manifest ────────────────────────────
  console.log('[3/5] Creating train/val/test splits and manifest...');

  const splits = filter.split(filterResult.accepted);
  console.log(`  Train: ${splits.train.length} | Val: ${splits.validation.length} | Test: ${splits.test.length}`);

  const manifestCreator = new NovaDatasetManifest();
  const manifest = manifestCreator.create(filterResult, 'v0.1', 'synthetic');
  manifest.splits = {
    train: splits.train.length,
    validation: splits.validation.length,
    test: splits.test.length,
  };

  // Save dataset files
  ensureDir(OUTPUT_DIR);
  writeJson(path.join(OUTPUT_DIR, 'train.jsonl'), splits.train);
  writeJson(path.join(OUTPUT_DIR, 'validation.jsonl'), splits.validation);
  writeJson(path.join(OUTPUT_DIR, 'test.jsonl'), splits.test);
  writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest);

  console.log(`  Dataset saved to ${OUTPUT_DIR}`);

  // ─── PHASE 4: Run Benchmarks ─────────────────────────────────────
  console.log('[4/5] Running evaluation benchmarks (simulated)...');

  const runner = new NovaBenchmarkRunner();
  const benchmarkResults: Record<string, any> = {};

  for (const [category, testCases] of Object.entries(NOVA_BENCHMARK_TEST_CASES)) {
    const result = runner.runBenchmark(
      'foundation-model',
      category,
      testCases.map(tc => ({ input: tc.input, expected: tc.expected_output }))
    );
    benchmarkResults[category] = result;
    console.log(`  ${category}: accuracy=${result.accuracy}, latency=${result.latency_ms}ms`);
  }

  // Generate comparison report
  const reportGen = new NovaComparisonReport();
  const comparisonReport = reportGen.generate(
    'Qwen/Qwen2.5-72B-Instruct',
    ['NOVA-v0.1 (synthetic)'],
    NOVA_BENCHMARK_TEST_CASES
  );

  // Save benchmark results
  ensureDir(REPORT_DIR);
  writeJson(path.join(REPORT_DIR, 'nova-v0.1-benchmarks.json'), benchmarkResults);
  writeJson(path.join(REPORT_DIR, 'nova-v0.1-comparison.json'), comparisonReport);
  fs.writeFileSync(path.join(REPORT_DIR, 'nova-v0.1-report.txt'), reportGen.formatReport(comparisonReport));

  console.log(`  Benchmarks saved to ${REPORT_DIR}`);

  // ─── PHASE 5: Register Model ─────────────────────────────────────
  console.log('[5/5] Registering NOVA v0.1 in model registry...');

  const registry = new NovaModelRegistry();
  if (fs.existsSync(REGISTRY_PATH)) {
    registry.load(REGISTRY_PATH);
  }

  const model = registry.register({
    model_id: '',
    model_name: 'NOVA',
    version: 'v0.1',
    base_model: 'Qwen/Qwen2.5-72B-Instruct',
    training_type: 'qlora',
    training_dataset_version: 'v0.1',
    training_config_path: './training/configs/nova-qlora.yaml',
    checkpoint_location: './checkpoints/nova-qlora-v0.1',
    notes: 'First NOVA dataset generated. Synthetic data only. No training performed yet. Foundation model baseline.',
  });

  // Add simulated benchmark metrics
  registry.updateMetrics(model.model_id, {
    dataset_examples: filterResult.stats.accepted_count,
    dataset_quality_avg: filterResult.stats.avg_quality_score,
    benchmark_categories: Object.keys(benchmarkResults).length,
    baseline_accuracy_avg: Number((Object.values(benchmarkResults).reduce((sum: number, r: any) => sum + r.accuracy, 0) / Object.keys(benchmarkResults).length).toFixed(3)),
    status: 0, // 0 = no training performed
  });

  registry.save(REGISTRY_PATH);
  console.log(`  Model registered: ${model.model_id}`);
  console.log(`  Status: ${model.status}`);
  console.log(`  Version: ${model.version}`);

  // ─── SUMMARY ─────────────────────────────────────────────────────
  console.log('\n=== NOVA v0.1 Launch Complete ===');
  console.log(`Dataset: ${OUTPUT_DIR}`);
  console.log(`Benchmarks: ${REPORT_DIR}`);
  console.log(`Registry: ${REGISTRY_PATH}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review dataset: cat ${OUTPUT_DIR}/manifest.json`);
  console.log(`  2. Review benchmarks: cat ${REPORT_DIR}/nova-v0.1-report.txt`);
  console.log(`  3. Provision GPU (A100 80GB) for QLoRA training`);
  console.log(`  4. Run: python -m training.scripts.run_qlora --config training/configs/nova-qlora.yaml`);
  console.log(`  5. Evaluate checkpoint and register NOVA v0.5`);
}

main().catch(console.error);
