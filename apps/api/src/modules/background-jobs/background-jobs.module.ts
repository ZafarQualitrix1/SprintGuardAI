import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { BackgroundJobsController } from './presentation/background-jobs.controller';
import { QueueRegistryService } from './infrastructure/services/queue-registry.service';
import { WorkerRegistryService } from './infrastructure/services/worker-registry.service';

// Bounded context module: Background Jobs (Admin Console "Background Jobs" tab). Producer-side
// only in the main app -- QueueRegistryService enqueues/inspects/manages jobs. WorkerRegistryService
// is also provided here (for DI convenience in apps/api/src/worker.ts) but starts nothing on its
// own; only worker.ts calls .startAll(), and only that entrypoint should ever run outside a
// request/response server process.
@Module({
  controllers: [BackgroundJobsController],
  providers: [QueueRegistryService, WorkerRegistryService],
  exports: [QueueRegistryService, WorkerRegistryService],
})
export class BackgroundJobsModule implements OnModuleInit {
  private readonly logger = new Logger(BackgroundJobsModule.name);

  constructor(private readonly queueRegistry: QueueRegistryService) {}

  async onModuleInit(): Promise<void> {
    // Registers the repeatable schedule metadata in Redis (a producer-side action, not a
    // consumer) -- never throws the app down if Redis isn't reachable yet, since every other
    // environment except local dev currently has no managed Redis provisioned (see Background
    // Jobs' operational prerequisite).
    //
    // The try/catch alone isn't enough: ioredis retries a broken connection indefinitely by
    // default, so an unreachable REDIS_URL leaves the underlying `.add()` call neither resolved
    // nor rejected -- onModuleInit() (and therefore the entire app's bootstrap) hangs forever
    // instead of failing fast. Race it against a short timeout so a bad/missing Redis can only
    // ever delay boot briefly, never block it.
    try {
      await Promise.race([
        this.queueRegistry.ensureAutoSyncScannerScheduled(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timed out waiting for Redis')), 3000),
        ),
      ]);
    } catch (error) {
      this.logger.warn(`Could not schedule the jira-auto-sync scanner (is REDIS_URL reachable?): ${error}`);
    }
  }
}
