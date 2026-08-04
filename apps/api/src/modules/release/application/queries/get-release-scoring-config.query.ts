import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  RELEASE_METRICS_READ_REPOSITORY,
  IReleaseMetricsReadRepository,
} from '../../domain/repositories/release-metrics-read.repository.interface';
import {
  RELEASE_SCORING_CONFIG_REPOSITORY,
  IReleaseScoringConfigRepository,
} from '../../domain/repositories/release-scoring-config.repository.interface';
import { DEFAULT_RELEASE_SCORING_CONFIG, ReleaseScoringConfigEntity } from '../../domain/entities/release-scoring-config.entity';

export class GetReleaseScoringConfigQuery {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
  ) {}
}

export interface ReleaseScoringConfigResult extends ReleaseScoringConfigEntity {
  isCustomized: boolean;
}

@QueryHandler(GetReleaseScoringConfigQuery)
export class GetReleaseScoringConfigHandler
  implements IQueryHandler<GetReleaseScoringConfigQuery, ReleaseScoringConfigResult>
{
  constructor(
    @Inject(RELEASE_METRICS_READ_REPOSITORY)
    private readonly metricsReadRepository: IReleaseMetricsReadRepository,
    @Inject(RELEASE_SCORING_CONFIG_REPOSITORY)
    private readonly scoringConfigRepository: IReleaseScoringConfigRepository,
  ) {}

  async execute(query: GetReleaseScoringConfigQuery): Promise<ReleaseScoringConfigResult> {
    const ref = await this.metricsReadRepository.findSprintProjectRef(query.sprintId, query.organizationId);
    if (!ref) {
      throw new NotFoundException('Sprint not found');
    }

    const saved = await this.scoringConfigRepository.findByProjectId(ref.projectId);
    if (saved) {
      return { ...saved, isCustomized: true };
    }
    return { projectId: ref.projectId, ...DEFAULT_RELEASE_SCORING_CONFIG, isCustomized: false };
  }
}
