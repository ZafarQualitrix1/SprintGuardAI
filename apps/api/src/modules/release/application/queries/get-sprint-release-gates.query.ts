import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  RELEASE_METRICS_READ_REPOSITORY,
  IReleaseMetricsReadRepository,
  SprintGates,
} from '../../domain/repositories/release-metrics-read.repository.interface';

export class GetSprintReleaseGatesQuery {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
  ) {}
}

@QueryHandler(GetSprintReleaseGatesQuery)
export class GetSprintReleaseGatesHandler implements IQueryHandler<GetSprintReleaseGatesQuery, SprintGates> {
  constructor(
    @Inject(RELEASE_METRICS_READ_REPOSITORY)
    private readonly metricsReadRepository: IReleaseMetricsReadRepository,
  ) {}

  async execute(query: GetSprintReleaseGatesQuery): Promise<SprintGates> {
    const ref = await this.metricsReadRepository.findSprintProjectRef(query.sprintId, query.organizationId);
    if (!ref) {
      throw new NotFoundException('Sprint not found');
    }
    return this.metricsReadRepository.getSprintGates(query.sprintId);
  }
}
