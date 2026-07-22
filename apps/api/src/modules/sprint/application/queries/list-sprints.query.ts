import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PROJECT_REPOSITORY,
  IProjectRepository,
} from '../../domain/repositories/project.repository.interface';
import { SPRINT_REPOSITORY, ISprintRepository } from '../../domain/repositories/sprint.repository.interface';
import { SprintEntity } from '../../domain/entities/sprint.entity';

export class ListSprintsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly projectId: string,
  ) {}
}

@QueryHandler(ListSprintsQuery)
export class ListSprintsHandler implements IQueryHandler<ListSprintsQuery, SprintEntity[]> {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository,
  ) {}

  async execute(query: ListSprintsQuery): Promise<SprintEntity[]> {
    const project = await this.projectRepository.findById(query.projectId, query.organizationId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return this.sprintRepository.listByProject(project.id, query.organizationId);
  }
}
