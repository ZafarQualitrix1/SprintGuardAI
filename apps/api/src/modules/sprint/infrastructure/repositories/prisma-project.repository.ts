import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  CreateProjectInput,
  IProjectRepository,
  ProjectWithSprints,
} from '../../domain/repositories/project.repository.interface';
import { toProjectEntity, toSprintEntity } from '../mappers';

@Injectable()
export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateProjectInput) {
    const row = await this.prisma.project.create({
      data: {
        organizationId: input.organizationId,
        key: input.key,
        name: input.name,
        description: input.description,
      },
    });
    return toProjectEntity(row);
  }

  async findById(id: string, organizationId: string) {
    const row = await this.prisma.project.findFirst({ where: { id, organizationId } });
    return row ? toProjectEntity(row) : null;
  }

  async findByKey(organizationId: string, key: string) {
    const row = await this.prisma.project.findFirst({ where: { organizationId, key } });
    return row ? toProjectEntity(row) : null;
  }

  async listByOrganization(organizationId: string) {
    const rows = await this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toProjectEntity);
  }

  async listByOrganizationWithSprints(organizationId: string): Promise<ProjectWithSprints[]> {
    const rows = await this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        sprints: {
          where: { deletedAt: null, archivedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return rows.map((row) => ({
      project: toProjectEntity(row),
      sprints: row.sprints.map((sprint) => toSprintEntity(sprint)),
    }));
  }
}
