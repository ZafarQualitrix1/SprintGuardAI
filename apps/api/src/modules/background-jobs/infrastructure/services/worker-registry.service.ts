import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Worker } from 'bullmq';
import { TestConnectionCommand } from '../../../integration/application/commands/test-connection.command';
import { SyncConnectionCommand } from '../../../integration/application/commands/sync-connection.command';
import { ScanJiraAutoSyncCandidatesQuery } from '../../../organization-settings/application/queries/scan-jira-auto-sync-candidates.query';
import { ComputeReleaseReadinessCommand } from '../../../release/application/commands/compute-release-readiness.command';
import { ReleaseReportEntity } from '../../../release/domain/entities/release-report.entity';
import { toReleaseReportDto } from '../../../release/presentation/mappers/release-report-dto.mapper';
import { QueueRegistryService } from './queue-registry.service';

// A broadcaster is injected rather than importing ReleaseReadinessGateway directly here --
// WorkerRegistryService lives in BackgroundJobsModule (shared with the main API process, see the
// class comment below), while the gateway only exists in the worker's own second, WS-only Nest
// application (ReleaseRealtimeModule). Keeping this an interface avoids BackgroundJobsModule ever
// needing to depend on the WebSocket stack.
export interface ReleaseReadinessBroadcaster {
  broadcastUpdated(sprintId: string, report: ReturnType<typeof toReleaseReportDto>): void;
}

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

  startAll(commandBus: CommandBus, queryBus: QueryBus, releaseBroadcaster?: ReleaseReadinessBroadcaster): void {
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

    // AI Release Readiness Algorithm real-time recalculation: debounced by QueueRegistryService,
    // one job per triggering burst of changes. Recomputes deterministically (same command the
    // "Compute readiness" button calls) and pushes the fresh report over the WebSocket gateway --
    // best-effort, since a client not currently connected will just see it on next page load/GET.
    const releaseRecomputeWorker = new Worker(
      'release-readiness-recompute',
      async (job) => {
        const { organizationId, sprintId } = job.data as { organizationId: string; sprintId: string; reason: string };
        const report = await commandBus.execute<ComputeReleaseReadinessCommand, ReleaseReportEntity>(
          new ComputeReleaseReadinessCommand(organizationId, sprintId),
        );
        releaseBroadcaster?.broadcastUpdated(sprintId, toReleaseReportDto(report));
      },
      { connection },
    );

    for (const worker of [healthCheckWorker, autoSyncWorker, scannerWorker, releaseRecomputeWorker]) {
      worker.on('failed', (job, error) => this.logger.warn(`Job ${job?.id} on ${worker.name} failed: ${error.message}`));
    }

    this.workers = [healthCheckWorker, autoSyncWorker, scannerWorker, releaseRecomputeWorker];
    this.logger.log(`Started ${this.workers.length} BullMQ workers: ${this.workers.map((w) => w.name).join(', ')}`);
  }

  async stopAll(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
  }
}
