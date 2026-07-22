import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '../../domain/repositories/requirement.repository.interface';
import { RequirementEntity } from '../../domain/entities/requirement.entity';

export class GetRequirementsByStoryQuery {
  constructor(public readonly storyId: string) {}
}

@QueryHandler(GetRequirementsByStoryQuery)
export class GetRequirementsByStoryHandler
  implements IQueryHandler<GetRequirementsByStoryQuery, RequirementEntity[]>
{
  constructor(@Inject(REQUIREMENT_REPOSITORY) private readonly requirementRepository: IRequirementRepository) {}

  execute(query: GetRequirementsByStoryQuery): Promise<RequirementEntity[]> {
    return this.requirementRepository.findByStoryId(query.storyId);
  }
}
