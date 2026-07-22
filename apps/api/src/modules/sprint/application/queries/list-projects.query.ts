import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PROJECT_REPOSITORY,
  IProjectRepository,
} from '../../domain/repositories/project.repository.interface';
import { ProjectEntity } from '../../domain/entities/project.entity';

export class ListProjectsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListProjectsQuery)
export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery, ProjectEntity[]> {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository) {}

  execute(query: ListProjectsQuery): Promise<ProjectEntity[]> {
    return this.projectRepository.listByOrganization(query.organizationId);
  }
}
