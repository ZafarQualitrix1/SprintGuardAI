import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IStoryReadRepository } from '../../domain/repositories/story-read.repository.interface';

@Injectable()
export class PrismaStoryReadRepository implements IStoryReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(storyId: string, organizationId: string) {
    const row = await this.prisma.story.findFirst({
      where: { id: storyId, sprint: { project: { organizationId } } },
      select: { id: true, title: true, description: true },
    });
    return row;
  }
}
