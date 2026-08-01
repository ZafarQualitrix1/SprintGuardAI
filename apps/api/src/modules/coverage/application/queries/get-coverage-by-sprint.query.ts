import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { COVERAGE_REPOSITORY, ICoverageRepository } from '../../domain/repositories/coverage.repository.interface';
import { CoverageResultEntity } from '../../domain/entities/coverage.entity';

export class GetCoverageBySprintQuery {
  constructor(public readonly sprintId: string) {}
}

@QueryHandler(GetCoverageBySprintQuery)
export class GetCoverageBySprintHandler
  implements IQueryHandler<GetCoverageBySprintQuery, CoverageResultEntity | null>
{
  constructor(@Inject(COVERAGE_REPOSITORY) private readonly coverageRepository: ICoverageRepository) {}

  execute(query: GetCoverageBySprintQuery): Promise<CoverageResultEntity | null> {
    return this.coverageRepository.findBySprintId(query.sprintId);
  }
}
