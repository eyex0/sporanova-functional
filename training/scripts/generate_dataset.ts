import path from 'path';
import fs from 'fs';
import { NovaDatasetGenerator } from '../generation/generator';
import { NovaDatasetFilter } from '../filtering/filter';
import { NovaDatasetManifest } from '../datasets/manifest';

function writeJsonl(filePath: string, data: any[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const lines = data.map(item => JSON.stringify(item)).join('\n');
  fs.writeFileSync(filePath, lines, 'utf-8');
}

async function generateDataset(countPerCategory: number, outputPath: string): Promise<void> {
  console.log(`Generating NOVA dataset: ${countPerCategory} examples per category`);
  console.log(`Output directory: ${outputPath}\n`);

  const generator = new NovaDatasetGenerator();
  const filter = new NovaDatasetFilter();
  const manifest = new NovaDatasetManifest();

  console.log('Step 1: Generating examples...');
  const allExamples = generator.generateAll(countPerCategory);
  console.log(`  Generated ${allExamples.length} examples\n`);

  console.log('Step 2: Filtering...');
  const filterResult = filter.filter(allExamples);
  console.log(`  Accepted: ${filterResult.stats.accepted_count}`);
  console.log(`  Rejected: ${filterResult.stats.rejected_count}`);
  console.log(`  Avg quality: ${filterResult.stats.avg_quality_score}\n`);

  console.log('Step 3: Splitting...');
  const splits = filter.split(filterResult.accepted);
  console.log(`  Train: ${splits.train.length}`);
  console.log(`  Validation: ${splits.validation.length}`);
  console.log(`  Test: ${splits.test.length}\n`);

  console.log('Step 4: Creating manifest...');
  const datasetManifest = manifest.create(filterResult, '1.0.0', 'synthetic');
  console.log(`  Dataset ID: ${datasetManifest.dataset_id}\n`);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  console.log('Step 5: Writing files...');
  const trainPath = path.join(outputPath, 'train.jsonl');
  const valPath = path.join(outputPath, 'validation.jsonl');
  const testPath = path.join(outputPath, 'test.jsonl');
  const manifestPath = path.join(outputPath, 'manifest.json');

  writeJsonl(trainPath, splits.train);
  writeJsonl(valPath, splits.validation);
  writeJsonl(testPath, splits.test);
  manifest.save(datasetManifest, manifestPath);

  console.log(`  Saved: ${trainPath}`);
  console.log(`  Saved: ${valPath}`);
  console.log(`  Saved: ${testPath}`);
  console.log(`  Saved: ${manifestPath}\n`);

  console.log('=== Dataset Statistics ===');
  console.log(`Total examples: ${datasetManifest.total_examples}`);
  console.log(`Quality: avg=${datasetManifest.quality_stats.avg_quality_score}, min=${datasetManifest.quality_stats.min_quality_score}`);
  console.log(`Language distribution:`, datasetManifest.language_distribution);
  console.log(`Category distribution:`, datasetManifest.category_distribution);
}

const args = process.argv.slice(2);
const countPerCategory = parseInt(args[0] || '10', 10);
const outputPath = args[1] || path.join(__dirname, '../output/dataset');

generateDataset(countPerCategory, outputPath).catch((err) => {
  console.error('Dataset generation failed:', err);
  process.exit(1);
});

export default generateDataset;
