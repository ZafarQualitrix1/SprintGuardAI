import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IStoryContextReadRepository } from '../../domain/repositories/story-context-read.repository.interface';

@Injectable()
export class PrismaStoryContextReadRepository implements IStoryContextReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(storyId: string, organizationId: string) {
    const row = await this.prisma.story.findFirst({
      where: { id: storyId, sprint: { project: { organizationId } } },
      select: {
        id: true,
        title: true,
        description: true,
        externalId: true,
        sprintId: true,
        assignedBaEmail: true,
        assignedBaJiraAccountId: true,
        assignedBaAccountResolvedAt: true,
        sprint: { select: { name: true, sourceConnectionId: true } },
      },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      externalId: row.externalId,
      sprintId: row.sprintId,
      sprintName: row.sprint.name,
      sourceConnectionId: row.sprint.sourceConnectionId,
      assignedBaEmail: row.assignedBaEmail,
      assignedBaJiraAccountId: row.assignedBaJiraAccountId,
      assignedBaAccountResolvedAt: row.assignedBaAccountResolvedAt,
    };
  }
}
