import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SPRINT_REPOSITORY, ISprintRepository } from '../../domain/repositories/sprint.repository.interface';
import { SprintWithStories } from '../../domain/entities/sprint.entity';

export class GetSprintQuery {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
  ) {}
}

@QueryHandler(GetSprintQuery)
export class GetSprintHandler implements IQueryHandler<GetSprintQuery, SprintWithStories> {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository) {}

  async execute(query: GetSprintQuery): Promise<SprintWithStories> {
    const result = await this.sprintRepository.findByIdWithStories(query.sprintId, query.organizationId);
    if (!result) {
      throw new NotFoundException('Sprint not found');
    }
    return result;
  }
}
