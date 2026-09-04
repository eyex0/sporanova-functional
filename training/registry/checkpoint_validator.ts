// NOVA Checkpoint Validator & Artifact Verifier
// Validates that an externally produced checkpoint has the required structure

import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export interface CheckpointValidationResult {
  valid: boolean;
  checkpoint_path: string;
  errors: string[];
  warnings: string[];
  artifacts: string[];
  adapter_exists: boolean;
  tokenizer_exists: boolean;
  config_exists: boolean;
  adapter_size_bytes: number;
  sha256?: string;
}

const REQUIRED_FILES = [
  'adapter_model.safetensors',
  'adapter_config.json',
];

const RECOMMENDED_FILES = [
  'training_args.bin',
  'trainer_state.json',
  'optimizer.pt',
  'scheduler.pt',
];

const REQUIRED_TOKENIZER_FILES = [
  'tokenizer.json',
  'tokenizer_config.json',
];

export class NovaCheckpointValidator {
  validate(checkpointPath: string): CheckpointValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const artifacts: string[] = [];

    // 1. Check base path exists
    if (!fs.existsSync(checkpointPath)) {
      return {
        valid: false,
        checkpoint_path: checkpointPath,
        errors: [`Checkpoint path does not exist: ${checkpointPath}`],
        warnings: [],
        artifacts: [],
        adapter_exists: false,
        tokenizer_exists: false,
        config_exists: false,
        adapter_size_bytes: 0,
      };
    }

    // 2. Find checkpoint directory (may be nested under checkpoint-XXX/)
    const resolvedPath = this.findCheckpointDir(checkpointPath);

    // 3. Check required adapter files
    let adapterExists = false;
    let adapterSize = 0;
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(resolvedPath, file);
      if (fs.existsSync(filePath)) {
        adapterExists = true;
        adapterSize += fs.statSync(filePath).size;
        artifacts.push(file);
      } else {
        errors.push(`Missing required file: ${file}`);
      }
    }

    // 4. Check recommended files
    for (const file of RECOMMENDED_FILES) {
      const filePath = path.join(resolvedPath, file);
      if (fs.existsSync(filePath)) {
        artifacts.push(file);
      } else {
        warnings.push(`Missing recommended file: ${file}`);
      }
    }

    // 5. Check tokenizer files
    let tokenizerExists = false;
    const tokenizerDir = path.join(resolvedPath, 'tokenizer');
    const parentTokenizerDir = path.dirname(resolvedPath);

    for (const searchDir of [resolvedPath, tokenizerDir, parentTokenizerDir]) {
      let found = 0;
      for (const file of REQUIRED_TOKENIZER_FILES) {
        if (fs.existsSync(path.join(searchDir, file))) {
          found++;
          if (!artifacts.includes(file)) artifacts.push(file);
        }
      }
      if (found === REQUIRED_TOKENIZER_FILES.length) {
        tokenizerExists = true;
        break;
      }
    }

    if (!tokenizerExists) {
      errors.push('Missing tokenizer files (tokenizer.json, tokenizer_config.json)');
    }

    // 6. Check config.json (may be in parent or nested)
    let configExists = false;
    for (const dir of [resolvedPath, path.dirname(resolvedPath)]) {
      if (fs.existsSync(path.join(dir, 'config.json'))) {
        configExists = true;
        if (!artifacts.includes('config.json')) artifacts.push('config.json');
        break;
      }
    }

    if (!configExists) {
      warnings.push('Missing config.json (base model config)');
    }

    // 7. Verify adapter_config.json is valid JSON with expected fields
    const adapterConfigPath = path.join(resolvedPath, 'adapter_config.json');
    if (fs.existsSync(adapterConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(adapterConfigPath, 'utf-8'));
        if (!config.peft_type) {
          warnings.push('adapter_config.json missing peft_type field');
        }
        if (!config.target_modules) {
          warnings.push('adapter_config.json missing target_modules field');
        }
        if (config.base_model_name_or_path !== 'Qwen/Qwen2.5-72B-Instruct') {
          warnings.push(
            `adapter_config.json base_model_name_or_path is "${config.base_model_name_or_path}", expected "Qwen/Qwen2.5-72B-Instruct"`
          );
        }
      } catch {
        errors.push('adapter_config.json is not valid JSON');
      }
    }

    // 8. Check for raw training data leakage
    const leakedFiles = this.checkForDataLeakage(resolvedPath);
    if (leakedFiles.length > 0) {
      errors.push(`Potential data leakage: found raw data files in checkpoint: ${leakedFiles.join(', ')}`);
    }

    // 9. Compute SHA-256 of adapter weights
    let sha256: string | undefined;
    const adapterPath = path.join(resolvedPath, 'adapter_model.safetensors');
    if (fs.existsSync(adapterPath)) {
      sha256 = this.computeSha256(adapterPath);
    }

    return {
      valid: errors.length === 0,
      checkpoint_path: resolvedPath,
      errors,
      warnings,
      artifacts,
      adapter_exists: adapterExists,
      tokenizer_exists: tokenizerExists,
      config_exists: configExists,
      adapter_size_bytes: adapterSize,
      sha256,
    };
  }

  private findCheckpointDir(basePath: string): string {
    // If basePath contains adapter_model.safetensors directly
    if (fs.existsSync(path.join(basePath, 'adapter_model.safetensors'))) {
      return basePath;
    }

    // Look for checkpoint-XXX subdirectories
    const entries = fs.readdirSync(basePath);
    for (const entry of entries) {
      if (entry.startsWith('checkpoint-')) {
        const cpDir = path.join(basePath, entry);
        if (fs.existsSync(path.join(cpDir, 'adapter_model.safetensors'))) {
          return cpDir;
        }
      }
    }

    return basePath;
  }

  private checkForDataLeakage(dir: string): string[] {
    const leaked: string[] = [];
    const dangerPatterns = ['.jsonl', 'train.json', 'dataset', 'user_conversations', '.csv'];

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          walk(path.join(currentDir, entry.name));
        } else {
          for (const pattern of dangerPatterns) {
            if (entry.name.includes(pattern) && !entry.name.includes('adapter') && !entry.name.includes('tokenizer')) {
              leaked.push(entry.name);
            }
          }
        }
      }
    };

    walk(dir);
    return leaked;
  }

  private computeSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }
}
