import { Controller, HttpCode, HttpStatus, Inject, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { Public } from '../../../common/decorators/public.decorator';
import { InternalSecretGuard } from '../../../common/guards/internal-secret.guard';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../domain/repositories/integration-connection.repository.interface';
import { TestConnectionCommand, TestConnectionResult } from '../application/commands/test-connection.command';

// Invoked on a schedule by .github/workflows/integration-health-check.yml (every 15 minutes) --
// NOT by a native Vercel Cron, since Vercel's Hobby plan caps cron jobs at once/day, which can't
// deliver a 15-minute cadence. Protected by a shared secret (InternalSecretGuard) rather than
// JwtAuthGuard/PermissionsGuard, since there's no logged-in user making this request.
@ApiExcludeController()
@Controller('internal/integrations')
export class InternalIntegrationsController {
  private readonly logger = new Logger(InternalIntegrationsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
  ) {}

  @Post('health-check-sweep')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(InternalSecretGuard)
  async sweep(): Promise<{ checked: number; healthy: number; unhealthy: number }> {
    const connections = await this.connectionRepository.listAllConnected();

    const results = await Promise.allSettled(
      connections.map((connection) =>
        this.commandBus.execute<TestConnectionCommand, TestConnectionResult>(
          new TestConnectionCommand(connection.organizationId, connection.id),
        ),
      ),
    );

    let healthy = 0;
    let unhealthy = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.healthStatus === 'HEALTHY') healthy++;
        else unhealthy++;
      } else {
        unhealthy++;
        this.logger.warn(`Health-check sweep failed for a connection: ${String(result.reason)}`);
      }
    }

    return { checked: connections.length, healthy, unhealthy };
  }
}
