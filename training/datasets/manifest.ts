import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  DatasetManifest,
  DatasetFilterResult,
  NovaTrainingExample,
  NovaLanguage,
  NovaCategory,
} from '../types';

export class NovaDatasetManifest {
  /**
   * Create a dataset manifest from a filter result.
   */
  create(
    filterResult: DatasetFilterResult,
    version: string,
    source: 'synthetic' | 'curated' | 'continuous_learning' | 'hybrid',
  ): DatasetManifest {
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const datasetId = `nova-ds-${version}-${timestamp}-${uniqueId}`;

    const { stats } = filterResult;

    const acceptedCount = stats.accepted_count;
    const trainSplit = Math.floor(acceptedCount * 0.8);
    const testSplit = Math.floor(acceptedCount * 0.1);
    const validationSplit = acceptedCount - trainSplit - testSplit;

    const qualityScores = filterResult.accepted.map((e) => e.quality_score);
    const avgQuality =
      qualityScores.length > 0
        ? Number((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(2))
        : 0;
    const minQuality =
      qualityScores.length > 0 ? Math.min(...qualityScores) : 0;

    return {
      dataset_id: datasetId,
      version,
      source,
      created_at: new Date().toISOString(),
      total_examples: acceptedCount,
      splits: {
        train: trainSplit,
        validation: validationSplit,
        test: testSplit,
      },
      rejected_count: stats.rejected_count,
      quality_stats: {
        avg_quality_score: avgQuality,
        min_quality_score: minQuality,
      },
      language_distribution: stats.language_distribution as Record<string, number>,
      category_distribution: stats.category_distribution,
    };
  }

  /**
   * Save a manifest to disk as JSON.
   */
  save(manifest: DatasetManifest, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Load a manifest from disk.
   */
  load(filePath: string): DatasetManifest {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Manifest file not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as DatasetManifest;
  }

  /**
   * Compare two dataset manifests and return a diff report.
   */
  compare(
    a: DatasetManifest,
    b: DatasetManifest,
  ): Record<string, any> {
    const result: Record<string, any> = {
      dataset_id_a: a.dataset_id,
      dataset_id_b: b.dataset_id,
      version_diff: { from: a.version, to: b.version },
      total_examples_diff: b.total_examples - a.total_examples,
      splits_diff: {
        train: b.splits.train - a.splits.train,
        validation: b.splits.validation - a.splits.validation,
        test: b.splits.test - a.splits.test,
      },
      quality_change: {
        avg_quality_score_diff: Number(
          (b.quality_stats.avg_quality_score - a.quality_stats.avg_quality_score).toFixed(2),
        ),
        min_quality_score_diff: Number(
          (b.quality_stats.min_quality_score - a.quality_stats.min_quality_score).toFixed(2),
        ),
      },
      rejected_count_diff: b.rejected_count - a.rejected_count,
      language_distribution_changes: this.diffRecord(
        a.language_distribution,
        b.language_distribution,
      ),
      category_distribution_changes: this.diffRecord(
        a.category_distribution,
        b.category_distribution,
      ),
    };

    return result;
  }

  private diffRecord(
    a: Record<string, number>,
    b: Record<string, number>,
  ): Record<string, { before: number; after: number; delta: number }> {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const changes: Record<string, { before: number; after: number; delta: number }> = {};

    for (const key of allKeys) {
      const before = a[key] ?? 0;
      const after = b[key] ?? 0;
      changes[key] = { before, after, delta: after - before };
    }

    return changes;
  }
}
