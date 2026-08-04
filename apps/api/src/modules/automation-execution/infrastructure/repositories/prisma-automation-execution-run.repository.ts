import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateAutomationExecutionRunInput,
  IAutomationExecutionRunRepository,
  RunCompletedUpdate,
  RunStartedUpdate,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import { toAutomationExecutionRunEntity } from '../mappers';

@Injectable()
export class PrismaAutomationExecutionRunRepository implements IAutomationExecutionRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAutomationExecutionRunInput) {
    const row = await this.prisma.automationExecutionRun.create({
      data: {
        organizationId: input.organizationId,
        storyId: input.storyId,
        automationGenerationId: input.automationGenerationId,
        automationType: input.automationType,
        environment: input.environment,
        browser: input.browser,
        tags: input.tags as unknown as Prisma.InputJsonValue,
        parallelWorkers: input.parallelWorkers,
        triggeredBy: input.triggeredBy,
        status: 'QUEUED',
      },
    });
    return toAutomationExecutionRunEntity(row);
  }

  async findById(id: string) {
    const row = await this.prisma.automationExecutionRun.findUnique({ where: { id } });
    return row ? toAutomationExecutionRunEntity(row) : null;
  }

  async listByStoryId(storyId: string) {
    const rows = await this.prisma.automationExecutionRun.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAutomationExecutionRunEntity);
  }

  async markStarted(id: string, update: RunStartedUpdate) {
    const existing = await this.prisma.automationExecutionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Automation execution run not found');
    const row = await this.prisma.automationExecutionRun.update({
      where: { id },
      data: {
        status: 'RUNNING',
        githubRunId: update.githubRunId,
        githubRunUrl: update.githubRunUrl,
        startedAt: new Date(),
      },
    });
    return toAutomationExecutionRunEntity(row);
  }

  async markCompleted(id: string, update: RunCompletedUpdate) {
    const existing = await this.prisma.automationExecutionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Automation execution run not found');
    const row = await this.prisma.automationExecutionRun.update({
      where: { id },
      data: {
        status: update.status,
        totalTests: update.totalTests,
        passedTests: update.passedTests,
        failedTests: update.failedTests,
        skippedTests: update.skippedTests,
        testResultsJson: update.testResults as unknown as Prisma.InputJsonValue,
        logsText: update.logsText,
        errorMessage: update.errorMessage,
        reportArtifactUrl: update.reportArtifactUrl,
        completedAt: new Date(),
      },
    });
    return toAutomationExecutionRunEntity(row);
  }

  async markCancelled(id: string) {
    const existing = await this.prisma.automationExecutionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Automation execution run not found');
    const row = await this.prisma.automationExecutionRun.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    return toAutomationExecutionRunEntity(row);
  }

  async getEventContext(runId: string) {
    const run = await this.prisma.automationExecutionRun.findUnique({
      where: { id: runId },
      select: { organizationId: true, storyId: true },
    });
    if (!run) return null;
    // AutomationExecutionRun.storyId is a plain reference, not a Prisma relation (see schema),
    // so this is a second query rather than an `include`.
    const story = await this.prisma.story.findUnique({ where: { id: run.storyId }, select: { sprintId: true } });
    return story ? { organizationId: run.organizationId, sprintId: story.sprintId } : null;
  }
}
