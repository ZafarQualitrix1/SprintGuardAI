import { Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { InternalSecretGuard } from '../../../common/guards/internal-secret.guard';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../domain/repositories/integration-connection.repository.interface';
import { QueueRegistryService } from '../../background-jobs/infrastructure/services/queue-registry.service';

// Invoked on a schedule by .github/workflows/integration-health-check.yml (every 15 minutes) --
// NOT by a native Vercel Cron, since Vercel's Hobby plan caps cron jobs at once/day, which can't
// deliver a 15-minute cadence. Protected by a shared secret (InternalSecretGuard) rather than
// JwtAuthGuard/PermissionsGuard, since there's no logged-in user making this request.
//
// Enqueues one "integration-health-check" job per connected connection (Background Jobs module)
// rather than running every TestConnectionCommand inline -- the endpoint returns immediately and
// actual health checks happen on whatever process runs apps/api/src/worker.ts. Visible in Admin
// Console's Background Jobs tab.
@ApiExcludeController()
@Controller('internal/integrations')
export class InternalIntegrationsController {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly queueRegistry: QueueRegistryService,
  ) {}

  @Post('health-check-sweep')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(InternalSecretGuard)
  async sweep(): Promise<{ enqueued: number }> {
    const connections = await this.connectionRepository.listAllConnected();

    await Promise.all(
      connections.map((connection) =>
        this.queueRegistry.enqueue('integration-health-check', 'check', {
          organizationId: connection.organizationId,
          connectionId: connection.id,
        }),
      ),
    );

    return { enqueued: connections.length };
  }
}
