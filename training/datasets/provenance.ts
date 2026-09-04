// NOVA Dataset Provenance Tracker
// Tracks content hashes, seeds, and generator versions for reproducibility

import crypto from 'crypto';
import * as fs from 'fs';
import { NovaTrainingExample, DatasetManifest } from '../types';

export interface ProvenanceRecord {
  dataset_id: string;
  version: string;
  content_sha256: string;        // SHA-256 of sorted JSONL content
  example_count: number;
  generator_version: string;     // e.g., "1.0.0"
  filter_version: string;        // e.g., "1.0.0"
  random_seed: number | null;    // null if not seeded
  created_at: string;
  file_hashes: Record<string, string>;  // filename → sha256
}

export class NovaProvenanceTracker {
  /**
   * Compute SHA-256 hash of an array of training examples (deterministic).
   */
  computeContentHash(examples: NovaTrainingExample[]): string {
    const sorted = [...examples].sort((a, b) => a.id.localeCompare(b.id));
    const content = JSON.stringify(sorted);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Compute SHA-256 hash of a file.
   */
  computeFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create a provenance record for a generated dataset.
   */
  createRecord(
    manifest: DatasetManifest,
    examples: NovaTrainingExample[],
    options: {
      generator_version?: string;
      filter_version?: string;
      random_seed?: number | null;
      files?: string[];
    } = {}
  ): ProvenanceRecord {
    const contentHash = this.computeContentHash(examples);
    const fileHashes: Record<string, string> = {};

    if (options.files) {
      for (const file of options.files) {
        if (fs.existsSync(file)) {
          fileHashes[file] = this.computeFileHash(file);
        }
      }
    }

    return {
      dataset_id: manifest.dataset_id,
      version: manifest.version,
      content_sha256: contentHash,
      example_count: manifest.total_examples,
      generator_version: options.generator_version ?? '1.0.0',
      filter_version: options.filter_version ?? '1.0.0',
      random_seed: options.random_seed ?? null,
      created_at: manifest.created_at,
      file_hashes: fileHashes,
    };
  }

  /**
   * Verify that a dataset matches its provenance record.
   */
  verify(
    record: ProvenanceRecord,
    examples: NovaTrainingExample[]
  ): { matches: boolean; reason?: string } {
    const currentHash = this.computeContentHash(examples);

    if (currentHash !== record.content_sha256) {
      return {
        matches: false,
        reason: `Content hash mismatch: expected ${record.content_sha256}, got ${currentHash}`,
      };
    }

    if (examples.length !== record.example_count) {
      return {
        matches: false,
        reason: `Example count mismatch: expected ${record.example_count}, got ${examples.length}`,
      };
    }

    return { matches: true };
  }

  /**
   * Save provenance record to disk.
   */
  save(record: ProvenanceRecord, filePath: string): void {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
  }

  /**
   * Load provenance record from disk.
   */
  load(filePath: string): ProvenanceRecord {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Provenance file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}
