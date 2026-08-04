import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IStoryMetadataReadRepository } from '../../domain/repositories/story-metadata-read.repository.interface';

@Injectable()
export class PrismaStoryMetadataReadRepository implements IStoryMetadataReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(storyId: string, organizationId: string) {
    const row = await this.prisma.story.findFirst({
      where: { id: storyId, sprint: { project: { organizationId } } },
      select: { id: true, title: true, externalId: true },
    });
    return row;
  }
}
