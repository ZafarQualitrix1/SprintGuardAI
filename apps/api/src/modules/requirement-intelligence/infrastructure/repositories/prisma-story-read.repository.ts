import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IStoryReadRepository } from '../../domain/repositories/story-read.repository.interface';

@Injectable()
export class PrismaStoryReadRepository implements IStoryReadRepository {
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
        sprint: { select: { sourceConnectionId: true } },
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
      sourceConnectionId: row.sprint.sourceConnectionId,
    };
  }
}
