import { ProjectEntity } from '../entities/project.entity';

export const PROJECT_REPOSITORY = Symbol('IProjectRepository');

export interface CreateProjectInput {
  organizationId: string;
  key: string;
  name: string;
  description?: string;
}

export interface IProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectEntity>;
  findById(id: string, organizationId: string): Promise<ProjectEntity | null>;
  findByKey(organizationId: string, key: string): Promise<ProjectEntity | null>;
  listByOrganization(organizationId: string): Promise<ProjectEntity[]>;
}
