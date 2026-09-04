import { NovaModelRecord, ModelStatus } from '../types';
import * as fs from 'fs';
import crypto from 'crypto';

const LIFECYCLE_ORDER: ModelStatus[] = [
  'TRAINING',
  'EVALUATION',
  'CANDIDATE',
  'APPROVED',
  'PRODUCTION',
  'DEPRECATED',
];

const VALID_TRANSITIONS: Record<ModelStatus, ModelStatus[]> = {
  TRAINING: ['EVALUATION', 'DEPRECATED'],
  EVALUATION: ['CANDIDATE', 'DEPRECATED'],
  CANDIDATE: ['APPROVED', 'DEPRECATED'],
  APPROVED: ['PRODUCTION', 'DEPRECATED'],
  PRODUCTION: ['DEPRECATED'],
  DEPRECATED: [],
};

export class NovaModelRegistry {
  private allRecords: NovaModelRecord[];

  constructor() {
    this.allRecords = [];
  }

  register(
    config: Omit<NovaModelRecord, 'created_at' | 'status'>
  ): NovaModelRecord {
    this.validateNoDuplicateVersion(config.model_name, config.version);

    const modelId = config.model_id || `nova-${crypto.randomUUID().slice(0, 8)}`;
    const record: NovaModelRecord = {
      ...config,
      model_id: modelId,
      status: 'TRAINING',
      created_at: new Date().toISOString(),
    };

    this.allRecords.push(record);
    return record;
  }

  updateStatus(modelId: string, status: ModelStatus, notes?: string): void {
    const model = this.allRecords.find(m => m.model_id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    this.validateTransition(model.status, status);

    model.status = status;
    if (notes) {
      model.notes = notes;
    }
  }

  updateMetrics(modelId: string, metrics: Record<string, number>): void {
    const model = this.allRecords.find(m => m.model_id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    model.metrics = { ...model.metrics, ...metrics };
  }

  promote(modelId: string): void {
    const model = this.allRecords.find(m => m.model_id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (model.status !== 'APPROVED') {
      throw new Error(
        `Cannot promote model ${modelId}: current status is ${model.status}, must be APPROVED`
      );
    }

    if (!model.metrics || Object.keys(model.metrics).length === 0) {
      throw new Error(
        `Cannot promote model ${modelId}: no evaluation results found`
      );
    }

    const currentProduction = this.getProduction();
    if (currentProduction && currentProduction.model_id !== modelId) {
      throw new Error(
        `Cannot promote model ${modelId}: model ${currentProduction.model_id} is currently in PRODUCTION. Deprecate it first.`
      );
    }

    model.status = 'PRODUCTION';
    model.promoted_at = new Date().toISOString();
  }

  deprecate(modelId: string): void {
    const model = this.allRecords.find(m => m.model_id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (!VALID_TRANSITIONS[model.status].includes('DEPRECATED')) {
      throw new Error(
        `Cannot deprecate model ${modelId}: current status is ${model.status}`
      );
    }

    model.status = 'DEPRECATED';
  }

  get(modelId: string): NovaModelRecord | undefined {
    return this.allRecords.find(m => m.model_id === modelId);
  }

  getByVersion(version: string): NovaModelRecord | undefined {
    return this.allRecords.find(m => m.version === version);
  }

  getProduction(): NovaModelRecord | undefined {
    return this.allRecords.find(m => m.status === 'PRODUCTION');
  }

  list(status?: ModelStatus): NovaModelRecord[] {
    if (!status) return [...this.allRecords];
    return this.allRecords.filter(m => m.status === status);
  }

  history(modelName: string): NovaModelRecord[] {
    return this.allRecords
      .filter(m => m.model_name === modelName)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  save(path: string): void {
    const json = JSON.stringify(this.allRecords, null, 2);
    fs.writeFileSync(path, json, 'utf-8');
  }

  load(path: string): void {
    const json = fs.readFileSync(path, 'utf-8');
    const data: NovaModelRecord[] = JSON.parse(json);
    this.allRecords = [...data];
  }

  private validateNoDuplicateVersion(modelName: string, version: string): void {
    const existing = this.allRecords.find(
      m => m.model_name === modelName && m.version === version
    );
    if (existing) {
      throw new Error(
        `Duplicate version: model "${modelName}" version "${version}" already exists (${existing.model_id})`
      );
    }
  }

  private validateTransition(from: ModelStatus, to: ModelStatus): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid status transition: ${from} -> ${to}. Allowed: ${allowed.join(', ')}`
      );
    }
  }
}
