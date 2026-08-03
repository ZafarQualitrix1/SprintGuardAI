import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  CreateTestScenarioInput,
  ITestScenarioRepository,
} from '../../domain/repositories/test-scenario.repository.interface';
import { toTestScenarioEntity } from '../mappers';

@Injectable()
export class PrismaTestScenarioRepository implements ITestScenarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForAcceptanceCriterion(
    acceptanceCriterionId: string,
    storyId: string,
    scenarios: CreateTestScenarioInput[],
  ) {
    const rows = await this.prisma.$transaction(async (tx) => {
      // Cascade-deletes TestCase rows (schema.prisma onDelete: Cascade).
      await tx.testScenario.deleteMany({ where: { acceptanceCriterionId } });

      const created = [];
      for (const scenario of scenarios) {
        const row = await tx.testScenario.create({
          data: {
            acceptanceCriterionId,
            storyId,
            title: scenario.title,
            description: scenario.description,
            priority: scenario.priority,
          },
          include: { testCases: true },
        });
        created.push(row);
      }
      return created;
    // Prisma's default interactive-transaction timeout is 5000ms -- see prisma-requirement.repository.ts
    // for why sequential per-row creates need explicit headroom.
    }, { timeout: 15000 });

    return rows.map(toTestScenarioEntity);
  }

  async findByStoryId(storyId: string) {
    const rows = await this.prisma.testScenario.findMany({
      where: { storyId },
      include: { testCases: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toTestScenarioEntity);
  }

  async findById(id: string) {
    const row = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { testCases: true },
    });
    return row ? toTestScenarioEntity(row) : null;
  }
}
