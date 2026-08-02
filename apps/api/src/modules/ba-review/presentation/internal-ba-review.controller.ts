import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { Public } from '../../../common/decorators/public.decorator';
import { InternalSecretGuard } from '../../../common/guards/internal-secret.guard';
import { SyncBaReviewThreadsCommand, SyncBaReviewThreadsResult } from '../application/commands/sync-ba-review-threads.command';

// Invoked on a schedule by .github/workflows/ba-review-sync.yml (every 5 minutes) -- same
// GitHub-Actions-cron + InternalSecretGuard pattern as InternalIntegrationsController's
// health-check sweep (Vercel's Hobby plan cron is capped at once/day, too coarse for BA-reply
// polling). No organizationId scoping -- fans out across every org with an active review cycle,
// same as the integration health-check sweep.
@ApiExcludeController()
@Controller('internal/ba-review')
export class InternalBaReviewController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('poll-sweep')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(InternalSecretGuard)
  async pollSweep(): Promise<SyncBaReviewThreadsResult> {
    return this.commandBus.execute<SyncBaReviewThreadsCommand, SyncBaReviewThreadsResult>(
      new SyncBaReviewThreadsCommand(),
    );
  }
}
