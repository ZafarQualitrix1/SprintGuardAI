import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Redis(this.configService.get<string>('redis.url')!, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (this.client.status !== 'ready' && this.client.status !== 'connecting') {
        await this.client.connect();
      }
      await this.client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
