import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { QueueRegistryService } from '../../../background-jobs/infrastructure/services/queue-registry.service';
import { ReleaseMetricsChangedEvent } from '../../domain/events/release-metrics-changed.event';

@EventsHandler(ReleaseMetricsChangedEvent)
export class ReleaseMetricsChangedHandler implements IEventHandler<ReleaseMetricsChangedEvent> {
  constructor(private readonly queueRegistry: QueueRegistryService) {}

  async handle(event: ReleaseMetricsChangedEvent): Promise<void> {
    await this.queueRegistry.enqueueDebouncedReleaseRecompute(event.organizationId, event.sprintId, event.reason);
  }
}
