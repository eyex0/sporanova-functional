import path from 'path';
import { NovaModelRegistry } from '../registry/model_registry';

async function registerModel(
  modelName: string,
  version: string,
  baseModel: string,
  trainingType: string,
  datasetVersion: string,
  checkpointPath: string,
  registryPath: string
): Promise<void> {
  console.log(`Registering model: ${modelName} v${version}`);

  const registry = new NovaModelRegistry();

  const fs = require('fs');
  if (fs.existsSync(registryPath)) {
    console.log(`Loading existing registry from: ${registryPath}`);
    registry.load(registryPath);
    const existing = registry.list();
    console.log(`  Found ${existing.length} existing model(s)`);
  }

  const record = registry.register({
    model_id: `nova-${modelName}-${version}-${Date.now()}`,
    model_name: modelName,
    version,
    base_model: baseModel,
    training_type: trainingType as any,
    training_dataset_version: datasetVersion,
    training_config_path: '',
    checkpoint_location: checkpointPath,
  });

  console.log('\nModel registered successfully:');
  console.log(`  Model ID:   ${record.model_id}`);
  console.log(`  Name:       ${record.model_name}`);
  console.log(`  Version:    ${record.version}`);
  console.log(`  Base:       ${record.base_model}`);
  console.log(`  Type:       ${record.training_type}`);
  console.log(`  Dataset:    ${record.training_dataset_version}`);
  console.log(`  Checkpoint: ${record.checkpoint_location}`);
  console.log(`  Status:     ${record.status}`);

  const dir = path.dirname(registryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  registry.save(registryPath);
  console.log(`\nRegistry saved to: ${registryPath}`);
}

const args = process.argv.slice(2);
if (args.length < 7) {
  console.log('Usage: npx tsx register_model.ts <modelName> <version> <baseModel> <trainingType> <datasetVersion> <checkpointPath> <registryPath>');
  console.log('Example: npx tsx register_model.ts nova-qwen3-8b v1.0.0 qwen3-8b qlora ds-1.0.0 ./checkpoints/nova ./registry/models.json');
  process.exit(1);
}

const [modelName, version, baseModel, trainingType, datasetVersion, checkpointPath, registryPath] = args;

registerModel(modelName, version, baseModel, trainingType, datasetVersion, checkpointPath, registryPath).catch((err) => {
  console.error('Model registration failed:', err);
  process.exit(1);
});

export default registerModel;
