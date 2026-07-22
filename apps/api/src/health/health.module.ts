import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@sprintguard/database';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';

// Liveness (/health/live) and readiness (/health/ready) probes consumed by the container
// orchestrator (Solution Architecture §26). Readiness additionally checks DB, Redis, and
// LLM provider reachability.
@Module({
  imports: [TerminusModule, HttpModule, DatabaseModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
