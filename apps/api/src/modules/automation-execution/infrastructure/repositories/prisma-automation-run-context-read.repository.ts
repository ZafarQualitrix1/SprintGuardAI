import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  AutomationFile,
  AutomationGenerationRunContext,
  IAutomationRunContextReadRepository,
} from '../../domain/repositories/automation-run-context-read.repository.interface';

@Injectable()
export class PrismaAutomationRunContextReadRepository implements IAutomationRunContextReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findGenerationForStory(
    automationGenerationId: string,
    storyId: string,
    organizationId: string,
  ): Promise<AutomationGenerationRunContext | null> {
    const row = await this.prisma.automationGeneration.findFirst({
      where: {
        id: automationGenerationId,
        testCase: { testScenario: { storyId, story: { sprint: { project: { organizationId } } } } },
      },
      select: { id: true, automationType: true, files: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      automationType: row.automationType as 'API' | 'UI',
      files: row.files as unknown as AutomationFile[],
    };
  }

  async findFilesByGenerationId(automationGenerationId: string): Promise<AutomationFile[] | null> {
    const row = await this.prisma.automationGeneration.findUnique({
      where: { id: automationGenerationId },
      select: { files: true },
    });
    return row ? (row.files as unknown as AutomationFile[]) : null;
  }
}
