import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IAcceptanceCriterionReadRepository } from '../../domain/repositories/acceptance-criterion-read.repository.interface';

@Injectable()
export class PrismaAcceptanceCriterionReadRepository implements IAcceptanceCriterionReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStoryId(storyId: string, organizationId: string) {
    const rows = await this.prisma.acceptanceCriterion.findMany({
      where: { requirement: { storyId, story: { sprint: { project: { organizationId } } } } },
      include: { requirement: { include: { story: { select: { title: true } } } } },
      orderBy: { order: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      storyId: row.requirement.storyId,
      storyTitle: row.requirement.story.title,
      given: row.given,
      when: row.when,
      then: row.then,
    }));
  }
}
