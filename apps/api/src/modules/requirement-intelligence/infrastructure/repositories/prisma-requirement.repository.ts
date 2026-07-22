import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  CreateRequirementInput,
  IRequirementRepository,
} from '../../domain/repositories/requirement.repository.interface';
import { toRequirementEntity } from '../mappers';

@Injectable()
export class PrismaRequirementRepository implements IRequirementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForStory(storyId: string, requirements: CreateRequirementInput[]) {
    const rows = await this.prisma.$transaction(async (tx) => {
      // Cascade-deletes AcceptanceCriterion rows (schema.prisma onDelete: Cascade) -- re-analysis
      // fully replaces the requirement set rather than merging (Solution Architecture §2).
      await tx.requirement.deleteMany({ where: { storyId } });

      const created = [];
      for (const requirement of requirements) {
        const row = await tx.requirement.create({
          data: {
            storyId,
            text: requirement.text,
            type: requirement.type,
            confidenceScore: requirement.confidenceScore,
            acceptanceCriteria: {
              create: requirement.acceptanceCriteria.map((ac, index) => ({
                given: ac.given,
                when: ac.when,
                then: ac.then,
                order: index,
              })),
            },
          },
          include: { acceptanceCriteria: true },
        });
        created.push(row);
      }
      return created;
    });

    return rows.map(toRequirementEntity);
  }

  async findByStoryId(storyId: string) {
    const rows = await this.prisma.requirement.findMany({
      where: { storyId },
      include: { acceptanceCriteria: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRequirementEntity);
  }
}
