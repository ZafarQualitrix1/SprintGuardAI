import { ProjectEntity } from '../entities/project.entity';
import { SprintEntity } from '../entities/sprint.entity';

export const PROJECT_REPOSITORY = Symbol('IProjectRepository');

export interface CreateProjectInput {
  organizationId: string;
  key: string;
  name: string;
  description?: string;
}

export interface ProjectWithSprints {
  project: ProjectEntity;
  sprints: SprintEntity[];
}

export interface IProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectEntity>;
  findById(id: string, organizationId: string): Promise<ProjectEntity | null>;
  findByKey(organizationId: string, key: string): Promise<ProjectEntity | null>;
  listByOrganization(organizationId: string): Promise<ProjectEntity[]>;
  // One query for the whole Sprint Dashboard page instead of 1 (projects) + N (sprints per
  // project) round trips -- each of those N extra requests pays its own auth/permission-guard and
  // Prisma-pool-acquisition overhead, which is what made the dashboard feel stuck with several projects.
  listByOrganizationWithSprints(organizationId: string): Promise<ProjectWithSprints[]>;
}
