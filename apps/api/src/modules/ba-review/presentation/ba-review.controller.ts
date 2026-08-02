import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetCurrentUserQuery } from '../../iam/application/queries/get-current-user.query';
import { AuthenticatedUserView } from '../../iam/application/commands/auth-session.types';
import { GetBaReviewStatusQuery, BaReviewStatusResult } from '../application/queries/get-ba-review-status.query';
import { GetReviewTimelineQuery } from '../application/queries/get-review-timeline.query';
import { GetBaReviewSyncLogsQuery } from '../application/queries/get-ba-review-sync-logs.query';
import { ApproveReviewCycleCommand } from '../application/commands/approve-review-cycle.command';
import { ProcessBaReplyCommand } from '../application/commands/process-ba-reply.command';
import { AdminUnlockStoryCommand } from '../application/commands/admin-unlock-story.command';
import { UpdateBaAssignmentCommand } from '../application/commands/update-ba-assignment.command';
import { SyncBaReviewThreadsCommand, SyncBaReviewThreadsResult } from '../application/commands/sync-ba-review-threads.command';
import { BaReviewCycleEntity } from '../domain/entities/ba-review-cycle.entity';
import {
  AdminUnlockDto,
  ApproveReviewCycleDto,
  BaReviewCycleDto,
  BaReviewStatusDto,
  BaReviewSyncLogDto,
  RequestChangesDto,
  UpdateBaAssignmentDto,
} from './dto/ba-review.dto';

function toCycleDto(entity: BaReviewCycleEntity): BaReviewCycleDto {
  return {
    id: entity.id,
    version: entity.version,
    documentVersionLabel: entity.documentVersionLabel,
    generatedBy: entity.generatedBy,
    generatedAt: entity.generatedAt.toISOString(),
    aiProvider: entity.aiProvider,
    aiModelVersion: entity.aiModelVersion,
    promptVersion: entity.promptVersion,
    totalTestCases: entity.totalTestCases,
    coveragePercent: entity.coveragePercent,
    automationReadinessPercent: entity.automationReadinessPercent,
    jiraCommentId: entity.jiraCommentId,
    jiraAttachmentId: entity.jiraAttachmentId,
    respondsToFeedbackFromVersionId: entity.respondsToFeedbackFromVersionId,
    improvementSummary: entity.improvementSummary,
    feedbackText: entity.feedbackText,
    feedbackAuthor: entity.feedbackAuthor,
    feedbackReceivedAt: entity.feedbackReceivedAt?.toISOString() ?? null,
    approvalStatus: entity.approvalStatus,
    approvedBy: entity.approvedBy,
    approvalComment: entity.approvalComment,
    approvedAt: entity.approvedAt?.toISOString() ?? null,
  };
}

// Mandatory BA-approval governance surface for a single story's AI-generated test cases. Reuses
// the test:* permission family (same bounded context as Test Intelligence) plus two new keys --
// test:approve (BA review actions) and test:admin-unlock (Admin override).
@ApiTags('BA Review')
@Controller('stories/:storyId/ba-review')
export class BaReviewController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('test:read')
  async getStatus(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BaReviewStatusDto> {
    const result = await this.queryBus.execute<GetBaReviewStatusQuery, BaReviewStatusResult>(
      new GetBaReviewStatusQuery(storyId, user.organizationId),
    );

    return {
      status: result.state?.status ?? 'PENDING_REVIEW',
      currentVersion: result.state?.currentVersion ?? 0,
      isLocked: result.state?.isLocked ?? false,
      reviewCycleCount: result.state?.reviewCycleCount ?? 0,
      latestReviewerName: result.state?.latestReviewerName ?? null,
      lastReviewAt: result.state?.lastReviewAt?.toISOString() ?? null,
      lockedAt: result.state?.lockedAt?.toISOString() ?? null,
      lockedVersionLabel: result.lockedCycle?.documentVersionLabel ?? null,
      approvedBy: result.lockedCycle?.approvedBy ?? null,
      approvalComment: result.lockedCycle?.approvalComment ?? null,
      activeCycle: result.activeCycle ? toCycleDto(result.activeCycle) : null,
      assignedBaEmail: result.assignedBaEmail,
    };
  }

  @Get('timeline')
  @RequirePermission('test:read')
  async getTimeline(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BaReviewCycleDto[]> {
    const cycles = await this.queryBus.execute<GetReviewTimelineQuery, BaReviewCycleEntity[]>(
      new GetReviewTimelineQuery(storyId, user.organizationId),
    );
    return cycles.map(toCycleDto);
  }

  @Get('sync-logs')
  @RequirePermission('test:read')
  async getSyncLogs(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BaReviewSyncLogDto[]> {
    const logs = await this.queryBus.execute<GetBaReviewSyncLogsQuery, { id: string; action: string; status: string; attempt: number; errorMessage: string | null; createdAt: Date }[]>(
      new GetBaReviewSyncLogsQuery(storyId, user.organizationId),
    );
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      status: log.status,
      attempt: log.attempt,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('test:approve')
  async approve(
    @Param('storyId') storyId: string,
    @Body() body: ApproveReviewCycleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BaReviewCycleDto> {
    const status = await this.queryBus.execute<GetBaReviewStatusQuery, BaReviewStatusResult>(
      new GetBaReviewStatusQuery(storyId, user.organizationId),
    );
    if (!status.activeCycle) {
      throw new Error('No active review cycle to approve for this story');
    }
    const reviewer = await this.queryBus.execute<GetCurrentUserQuery, AuthenticatedUserView>(
      new GetCurrentUserQuery(user.userId, user.organizationId),
    );

    const approved = await this.commandBus.execute<ApproveReviewCycleCommand, BaReviewCycleEntity>(
      new ApproveReviewCycleCommand(
        user.organizationId,
        storyId,
        status.activeCycle.id,
        reviewer.fullName,
        user.userId,
        body.approvalComment,
      ),
    );
    return toCycleDto(approved);
  }

  @Post('request-changes')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('test:approve')
  async requestChanges(
    @Param('storyId') storyId: string,
    @Body() body: RequestChangesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ accepted: true }> {
    const status = await this.queryBus.execute<GetBaReviewStatusQuery, BaReviewStatusResult>(
      new GetBaReviewStatusQuery(storyId, user.organizationId),
    );
    if (!status.activeCycle) {
      throw new Error('No active review cycle for this story');
    }
    const reviewer = await this.queryBus.execute<GetCurrentUserQuery, AuthenticatedUserView>(
      new GetCurrentUserQuery(user.userId, user.organizationId),
    );

    await this.commandBus.execute(
      new ProcessBaReplyCommand(
        user.organizationId,
        storyId,
        status.activeCycle.id,
        body.feedbackText,
        reviewer.fullName,
        `manual-${Date.now()}`,
        new Date(),
      ),
    );
    return { accepted: true };
  }

  @Post('admin-unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('test:admin-unlock')
  async adminUnlock(
    @Param('storyId') storyId: string,
    @Body() body: AdminUnlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ unlocked: true }> {
    await this.commandBus.execute(new AdminUnlockStoryCommand(user.organizationId, storyId, user.userId, body.reason));
    return { unlocked: true };
  }

  @Patch('assignment')
  @RequirePermission('test:write')
  async updateAssignment(
    @Param('storyId') storyId: string,
    @Body() body: UpdateBaAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ updated: true }> {
    await this.commandBus.execute(new UpdateBaAssignmentCommand(user.organizationId, storyId, body.assignedBaEmail));
    return { updated: true };
  }

  @Post('sync-now')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('test:approve')
  async syncNow(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SyncBaReviewThreadsResult> {
    return this.commandBus.execute<SyncBaReviewThreadsCommand, SyncBaReviewThreadsResult>(
      new SyncBaReviewThreadsCommand(user.organizationId, storyId),
    );
  }
}
