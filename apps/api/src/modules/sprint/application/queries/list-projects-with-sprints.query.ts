import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PROJECT_REPOSITORY,
  IProjectRepository,
  ProjectWithSprints,
} from '../../domain/repositories/project.repository.interface';

export class ListProjectsWithSprintsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListProjectsWithSprintsQuery)
export class ListProjectsWithSprintsHandler
  implements IQueryHandler<ListProjectsWithSprintsQuery, ProjectWithSprints[]>
{
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository) {}

  execute(query: ListProjectsWithSprintsQuery): Promise<ProjectWithSprints[]> {
    return this.projectRepository.listByOrganizationWithSprints(query.organizationId);
  }
}
