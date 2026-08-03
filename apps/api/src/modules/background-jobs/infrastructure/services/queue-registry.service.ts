import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';

export const QUEUE_NAMES = ['integration-health-check', 'jira-auto-sync', 'jira-auto-sync-scanner'] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

const SCANNER_REPEAT_JOB_ID = 'jira-auto-sync-scanner-repeat';
const SCANNER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface JobSummary {
  id: string;
  name: string;
  status: string;
  data: unknown;
  progress: unknown;
  attemptsMade: number;
  failedReason: string | null;
  timestamp: number;
  processedOn: number | null;
  finishedOn: number | null;
}

// Producer-side wrapper over BullMQ Queue instances -- safe to use from the main API process
// (enqueue/inspect/pause/resume/retry/remove are all lightweight Redis commands). Never
// constructs a BullMQ Worker itself (see WorkerRegistryService) -- a Worker's blocking-poll loop
// has no place inside a request/response server process.
@Injectable()
export class QueueRegistryService implements OnModuleDestroy {
  private readonly queues = new Map<QueueName, Queue>();

  constructor(private readonly configService: ConfigService) {}

  private getQueue(name: QueueName): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: { url: this.configService.get<string>('redis.url') } as never });
      this.queues.set(name, queue);
    }
    return queue;
  }

  async enqueue(name: QueueName, jobName: string, data: unknown): Promise<void> {
    await this.getQueue(name).add(jobName, data);
  }

  // Idempotent -- BullMQ dedupes repeatable jobs by their repeat key, so calling this on every
  // app boot never creates duplicate schedules.
  async ensureAutoSyncScannerScheduled(): Promise<void> {
    await this.getQueue('jira-auto-sync-scanner').add(
      'scan',
      {},
      { repeat: { every: SCANNER_INTERVAL_MS }, jobId: SCANNER_REPEAT_JOB_ID },
    );
  }

  async getCounts(name: QueueName): Promise<Record<string, number>> {
    return this.getQueue(name).getJobCounts();
  }

  async listRecentJobs(name: QueueName, limit = 25): Promise<JobSummary[]> {
    const jobs = await this.getQueue(name).getJobs(
      ['active', 'waiting', 'completed', 'failed', 'delayed'],
      0,
      limit - 1,
    );
    return Promise.all(jobs.map((job) => this.toSummary(job)));
  }

  private async toSummary(job: Job): Promise<JobSummary> {
    const state = await job.getState();
    return {
      id: job.id ?? '',
      name: job.name,
      status: state,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? null,
      timestamp: job.timestamp,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
    };
  }

  async retryJob(name: QueueName, jobId: string): Promise<void> {
    const job = await this.getQueue(name).getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job "${jobId}" not found in queue "${name}"`);
    }
    await job.retry();
  }

  async removeJob(name: QueueName, jobId: string): Promise<void> {
    const job = await this.getQueue(name).getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job "${jobId}" not found in queue "${name}"`);
    }
    await job.remove();
  }

  async pause(name: QueueName): Promise<void> {
    await this.getQueue(name).pause();
  }

  async resume(name: QueueName): Promise<void> {
    await this.getQueue(name).resume();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
