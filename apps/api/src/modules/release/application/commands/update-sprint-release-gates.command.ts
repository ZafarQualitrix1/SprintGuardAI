import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import {
  RELEASE_GATES_REPOSITORY,
  IReleaseGatesRepository,
  UpdateSprintGatesInput,
} from '../../domain/repositories/release-gates.repository.interface';
import { SprintGates } from '../../domain/repositories/release-metrics-read.repository.interface';
import { ReleaseMetricsChangedEvent } from '../../domain/events/release-metrics-changed.event';

export class UpdateSprintReleaseGatesCommand {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
    public readonly patch: UpdateSprintGatesInput,
  ) {}
}

@CommandHandler(UpdateSprintReleaseGatesCommand)
export class UpdateSprintReleaseGatesHandler
  implements ICommandHandler<UpdateSprintReleaseGatesCommand, SprintGates>
{
  constructor(
    @Inject(RELEASE_GATES_REPOSITORY) private readonly gatesRepository: IReleaseGatesRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateSprintReleaseGatesCommand): Promise<SprintGates> {
    const gates = await this.gatesRepository.updateGates(command.sprintId, command.organizationId, command.patch);
    if (!gates) {
      throw new NotFoundException('Sprint not found');
    }
    this.eventBus.publish(new ReleaseMetricsChangedEvent(command.organizationId, command.sprintId, 'gates-updated'));
    return gates;
  }
}
