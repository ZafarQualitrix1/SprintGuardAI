import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { WorkerRegistryService } from './modules/background-jobs/infrastructure/services/worker-registry.service';

// Separate, persistent-process entrypoint for the BullMQ Workers registered by
// WorkerRegistryService -- run this with `pnpm worker:start` (or `node dist/worker.js` in
// production) on a host that stays alive (NOT the Vercel serverless API deploy, which cannot
// host a blocking-poll consumer). Requires REDIS_URL to point at a real, reachable Redis
// instance -- see the Background Jobs operational prerequisite (every env file in this repo
// currently points at redis://localhost:6379, which only exists for local dev).
async function bootstrap() {
  const logger = new Logger('Worker');
  // createApplicationContext -- no HTTP listener, just the DI container, so every command/query
  // handler registered across the whole app is available via CommandBus/QueryBus exactly as it
  // would be inside the HTTP API process.
  const app = await NestFactory.createApplicationContext(AppModule);

  const workerRegistry = app.get(WorkerRegistryService);
  const commandBus = app.get(CommandBus);
  const queryBus = app.get(QueryBus);

  workerRegistry.startAll(commandBus, queryBus);
  logger.log('Background job workers running. Press Ctrl+C to stop.');

  const shutdown = async () => {
    logger.log('Shutting down workers...');
    await workerRegistry.stopAll();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
