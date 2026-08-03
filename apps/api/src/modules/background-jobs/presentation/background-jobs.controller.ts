import { BadRequestException, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { JobSummary, QUEUE_NAMES, QueueName, QueueRegistryService } from '../infrastructure/services/queue-registry.service';

export interface QueueOverview {
  name: QueueName;
  counts: Record<string, number>;
  recentJobs: JobSummary[];
}

function assertValidQueue(name: string): asserts name is QueueName {
  if (!(QUEUE_NAMES as readonly string[]).includes(name)) {
    throw new BadRequestException(`Unknown queue "${name}"`);
  }
}

// Presentation layer: HTTP entrypoints only. Backs Admin Console's "Background Jobs" tab. Every
// figure here is a live BullMQ Queue API call (getJobCounts/getJobs/pause/resume/retry/remove) --
// nothing is mocked. Requires a real Redis reachable from this API process (see
// docs on Background Jobs' operational prerequisite -- UAT/prod need a managed Redis
// provisioned before this reflects anything beyond empty queues).
@ApiTags('BackgroundJobs')
@Controller('background-jobs')
export class BackgroundJobsController {
  constructor(private readonly queueRegistry: QueueRegistryService) {}

  @Get()
  @RequirePermission('admin:platform')
  async overview(): Promise<QueueOverview[]> {
    return Promise.all(
      QUEUE_NAMES.map(async (name) => ({
        name,
        counts: await this.queueRegistry.getCounts(name),
        recentJobs: await this.queueRegistry.listRecentJobs(name),
      })),
    );
  }

  @Post(':queue/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('admin:platform')
  async retry(@Param('queue') queue: string, @Param('jobId') jobId: string): Promise<{ retried: true }> {
    assertValidQueue(queue);
    await this.queueRegistry.retryJob(queue, jobId);
    return { retried: true };
  }

  @Delete(':queue/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin:platform')
  async remove(@Param('queue') queue: string, @Param('jobId') jobId: string): Promise<void> {
    assertValidQueue(queue);
    await this.queueRegistry.removeJob(queue, jobId);
  }

  @Post(':queue/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('admin:platform')
  async pause(@Param('queue') queue: string): Promise<{ paused: true }> {
    assertValidQueue(queue);
    await this.queueRegistry.pause(queue);
    return { paused: true };
  }

  @Post(':queue/resume')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('admin:platform')
  async resume(@Param('queue') queue: string): Promise<{ resumed: true }> {
    assertValidQueue(queue);
    await this.queueRegistry.resume(queue);
    return { resumed: true };
  }
}
