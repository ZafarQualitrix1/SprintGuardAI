import { ReleaseScoringConfigEntity, ReleaseScoringWeights } from '../entities/release-scoring-config.entity';

export const RELEASE_SCORING_CONFIG_REPOSITORY = Symbol('IReleaseScoringConfigRepository');

export interface UpsertReleaseScoringConfigInput extends ReleaseScoringWeights {
  projectId: string;
  severityDeductions: ReleaseScoringConfigEntity['severityDeductions'];
  manualPassRateBlockThreshold: number;
  automationCoverageWarnThreshold: number;
}

export interface IReleaseScoringConfigRepository {
  /** Null when the project has never customized its scoring config -- caller applies defaults. */
  findByProjectId(projectId: string): Promise<ReleaseScoringConfigEntity | null>;
  upsert(input: UpsertReleaseScoringConfigInput): Promise<ReleaseScoringConfigEntity>;
}
