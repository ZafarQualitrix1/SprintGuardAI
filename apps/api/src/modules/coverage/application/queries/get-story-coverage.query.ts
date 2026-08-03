import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  COVERAGE_SOURCE_READ_REPOSITORY,
  ICoverageSourceReadRepository,
} from '../../domain/repositories/coverage-source-read.repository.interface';
import { StoryCoverageResultEntity } from '../../domain/entities/coverage.entity';
import { deriveStoryCoverage } from '../utils/derive-coverage.util';

export class GetStoryCoverageQuery {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

// Deliberately has no persistence step, unlike GetCoverageBySprintQuery (which just reads back
// whatever ComputeCoverageCommand last wrote). The dimension breakdown/traceability matrix depend
// on live TestCase.testType/automationStatus data that can change between computes (regeneration,
// BA-review-driven edits, ...), so a GET here always reflects current truth instead of a
// potentially-stale snapshot -- no side effects, matching plain REST GET semantics. Persisting
// CoverageMatrixEntry/Gap rows (so Release Readiness's sprint-wide aggregate sees them) only
// happens via the paired ComputeStoryCoverageCommand.
@QueryHandler(GetStoryCoverageQuery)
export class GetStoryCoverageHandler implements IQueryHandler<GetStoryCoverageQuery, StoryCoverageResultEntity> {
  constructor(
    @Inject(COVERAGE_SOURCE_READ_REPOSITORY) private readonly sourceReadRepository: ICoverageSourceReadRepository,
  ) {}

  async execute(query: GetStoryCoverageQuery): Promise<StoryCoverageResultEntity> {
    const source = await this.sourceReadRepository.getStoryCoverageSource(query.storyId, query.organizationId);
    if (!source) {
      throw new NotFoundException('Story not found');
    }

    const { entries, gaps, summary, dimensions, missingTestScenarios, missingAcceptanceCriteria, traceabilityMatrix } =
      deriveStoryCoverage(source);

    return new StoryCoverageResultEntity(
      source.storyId,
      source.storyTitle,
      summary,
      dimensions,
      entries.map((entry, index) => ({
        id: `live-${index}`,
        requirementId: entry.requirementId,
        requirementText: source.requirements.find((r) => r.id === entry.requirementId)?.text ?? '',
        coverageStatus: entry.coverageStatus,
        testCaseId: entry.testCaseId,
      })),
      gaps.map((gap, index) => ({
        id: `live-${index}`,
        requirementId: gap.requirementId,
        requirementText: source.requirements.find((r) => r.id === gap.requirementId)?.text ?? null,
        gapType: gap.gapType,
        severity: gap.severity,
        description: gap.description,
      })),
      missingTestScenarios,
      missingAcceptanceCriteria,
      traceabilityMatrix,
      null,
      new Date(),
    );
  }
}
