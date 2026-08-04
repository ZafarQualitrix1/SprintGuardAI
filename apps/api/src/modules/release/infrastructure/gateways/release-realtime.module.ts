import { Module } from '@nestjs/common';
import { ReleaseReadinessGateway } from './release-readiness.gateway';

// Standalone module for the Release Readiness WebSocket push. Deliberately NOT imported by
// ReleaseModule/AppModule -- bootstrapped only by apps/api/src/worker.ts as a second, separate
// Nest application (the one persistent process in this deployment that can hold connections
// open), so the Vercel-serverless main API never instantiates a WebSocketGateway.
@Module({
  providers: [ReleaseReadinessGateway],
  exports: [ReleaseReadinessGateway],
})
export class ReleaseRealtimeModule {}
