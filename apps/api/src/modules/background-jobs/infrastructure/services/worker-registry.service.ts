import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Worker } from 'bullmq';
import { TestConnectionCommand } from '../../../integration/application/commands/test-connection.command';
import { SyncConnectionCommand } from '../../../integration/application/commands/sync-connection.command';
import { ScanJiraAutoSyncCandidatesQuery } from '../../../organization-settings/application/queries/scan-jira-auto-sync-candidates.query';
import { QueueRegistryService } from './queue-registry.service';

// Consumer-side. Every `new Worker(...)` here opens a long-lived, blocking Redis connection --
// this must ONLY ever be instantiated from apps/api/src/worker.ts's own process, never from the
// main HTTP app (which is deployed as a Vercel serverless function and cannot host it). Nothing
// in this class starts on its own; startAll() is the explicit, single entrypoint the worker
// process calls.
@Injectable()
export class WorkerRegistryService {
  private readonly logger = new Logger(WorkerRegistryService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly queueRegistry: QueueRegistryService,
  ) {}

  startAll(commandBus: CommandBus, queryBus: QueryBus): void {
    const connection = { url: this.configService.get<string>('redis.url') } as never;

    const healthCheckWorker = new Worker(
      'integration-health-check',
      async (job) => {
        const { organizationId, connectionId } = job.data as { organizationId: string; connectionId: string };
        await commandBus.execute(new TestConnectionCommand(organizationId, connectionId));
      },
      { connection },
    );

    const autoSyncWorker = new Worker(
      'jira-auto-sync',
      async (job) => {
        const { organizationId, connectionId } = job.data as { organizationId: string; connectionId: string };
        await commandBus.execute(new SyncConnectionCommand(organizationId, connectionId));
      },
      { connection },
    );

    const scannerWorker = new Worker(
      'jira-auto-sync-scanner',
      async () => {
        const candidates = await queryBus.execute(new ScanJiraAutoSyncCandidatesQuery());
        for (const candidate of candidates) {
          await this.queueRegistry.enqueue('jira-auto-sync', 'sync', candidate);
        }
        return { enqueued: candidates.length };
      },
      { connection },
    );

    for (const worker of [healthCheckWorker, autoSyncWorker, scannerWorker]) {
      worker.on('failed', (job, error) => this.logger.warn(`Job ${job?.id} on ${worker.name} failed: ${error.message}`));
    }

    this.workers = [healthCheckWorker, autoSyncWorker, scannerWorker];
    this.logger.log(`Started ${this.workers.length} BullMQ workers: ${this.workers.map((w) => w.name).join(', ')}`);
  }

  async stopAll(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
  }
}
