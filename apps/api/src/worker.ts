import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { WorkerRegistryService } from './modules/background-jobs/infrastructure/services/worker-registry.service';
import { ReleaseRealtimeModule } from './modules/release/infrastructure/gateways/release-realtime.module';
import { ReleaseReadinessGateway } from './modules/release/infrastructure/gateways/release-readiness.gateway';

// Separate, persistent-process entrypoint for the BullMQ Workers registered by
// WorkerRegistryService -- run this with `pnpm worker:start` (or `node dist/worker.js` in
// production) on a host that stays alive (NOT the Vercel serverless API deploy, which cannot
// host a blocking-poll consumer). Requires REDIS_URL to point at a real, reachable Redis
// instance -- see the Background Jobs operational prerequisite (every env file in this repo
// currently points at redis://localhost:6379, which only exists for local dev).
//
// This process also hosts the Release Readiness WebSocket gateway (real-time score push) -- the
// one persistent, connection-holding process in this deployment, which is exactly why it's the
// right home for it. It's a second, separate Nest application (ReleaseRealtimeModule) rather than
// part of AppModule, so the gateway never gets pulled into the serverless API's module graph.
async function bootstrap() {
  const logger = new Logger('Worker');
  // createApplicationContext -- no HTTP listener, just the DI container, so every command/query
  // handler registered across the whole app is available via CommandBus/QueryBus exactly as it
  // would be inside the HTTP API process.
  const app = await NestFactory.createApplicationContext(AppModule);

  const realtimeApp = await NestFactory.create(ReleaseRealtimeModule, { logger: ['error', 'warn', 'log'] });
  realtimeApp.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true });
  realtimeApp.useWebSocketAdapter(new IoAdapter(realtimeApp));
  const workerPort = process.env.WORKER_PORT ? Number(process.env.WORKER_PORT) : 3002;
  await realtimeApp.listen(workerPort);
  const releaseGateway = realtimeApp.get(ReleaseReadinessGateway);
  logger.log(`Release Readiness WebSocket gateway listening on port ${workerPort}`);

  const workerRegistry = app.get(WorkerRegistryService);
  const commandBus = app.get(CommandBus);
  const queryBus = app.get(QueryBus);

  workerRegistry.startAll(commandBus, queryBus, releaseGateway);
  logger.log('Background job workers running. Press Ctrl+C to stop.');

  const shutdown = async () => {
    logger.log('Shutting down workers...');
    await workerRegistry.stopAll();
    await realtimeApp.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
