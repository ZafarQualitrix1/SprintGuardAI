import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  RELEASE_GATES_REPOSITORY,
  IReleaseGatesRepository,
  UpdateSprintGatesInput,
} from '../../domain/repositories/release-gates.repository.interface';
import { SprintGates } from '../../domain/repositories/release-metrics-read.repository.interface';

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
  constructor(@Inject(RELEASE_GATES_REPOSITORY) private readonly gatesRepository: IReleaseGatesRepository) {}

  async execute(command: UpdateSprintReleaseGatesCommand): Promise<SprintGates> {
    const gates = await this.gatesRepository.updateGates(command.sprintId, command.organizationId, command.patch);
    if (!gates) {
      throw new NotFoundException('Sprint not found');
    }
    return gates;
  }
}
