import path from 'path';
import fs from 'fs';
import { NovaBenchmarkRunner, NovaComparisonReport } from '../evaluation/benchmark';
import { NOVA_BENCHMARK_TEST_CASES } from '../evaluation/test_cases';

async function runBenchmark(modelName: string, outputDir: string): Promise<void> {
  console.log(`Running NOVA benchmarks for model: ${modelName}`);
  console.log(`Output directory: ${outputDir}\n`);

  const runner = new NovaBenchmarkRunner();
  const reporter = new NovaComparisonReport();

  const categories = Object.keys(NOVA_BENCHMARK_TEST_CASES);
  console.log(`Running ${categories.length} benchmark categories...\n`);

  const formattedSuites: Record<string, Array<{ input: string; expected: string }>> = {};
  for (const category of categories) {
    const cases = NOVA_BENCHMARK_TEST_CASES[category];
    formattedSuites[category] = cases.map(c => ({
      input: c.input,
      expected: c.expected_output,
    }));
  }

  const suite = runner.runFullSuite(modelName, formattedSuites);

  console.log('=== Benchmark Results ===\n');
  for (const result of suite.results) {
    console.log(
      `  ${result.benchmark.padEnd(28)} | ` +
      `accuracy: ${(result.accuracy * 100).toFixed(1)}%`.padEnd(18) +
      `| latency: ${result.latency_ms}ms`.padEnd(18) +
      `| score: ${(result.score * 100).toFixed(1)}`
    );
  }

  console.log(`\nTotal test cases: ${suite.test_count}`);

  const baseModel = 'qwen3-8b';
  const novaVersions = [modelName];

  console.log('\nGenerating comparison report...');
  const report = reporter.generate(baseModel, novaVersions, formattedSuites);
  const reportText = reporter.formatReport(report);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, `benchmark_report_${modelName}.txt`);
  fs.writeFileSync(reportPath, reportText, 'utf-8');
  console.log(`Report saved to: ${reportPath}`);

  const jsonPath = path.join(outputDir, `benchmark_results_${modelName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`JSON results saved to: ${jsonPath}`);

  console.log('\nDone.');
}

const args = process.argv.slice(2);
const modelName = args[0] || 'nova-qwen3-8b';
const outputDir = args[1] || path.join(__dirname, '../output/benchmarks');

runBenchmark(modelName, outputDir).catch((err) => {
  console.error('Benchmark run failed:', err);
  process.exit(1);
});

export default runBenchmark;
