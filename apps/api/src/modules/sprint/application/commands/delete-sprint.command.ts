import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SPRINT_REPOSITORY, ISprintRepository } from '../../domain/repositories/sprint.repository.interface';

// Soft delete (matches Organization/Project's deletedAt convention) -- reversible in principle,
// and never cascades a hard DB delete through the sprint's Stories/AI data.
export class DeleteSprintCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly sprintId: string,
  ) {}
}

@CommandHandler(DeleteSprintCommand)
export class DeleteSprintHandler implements ICommandHandler<DeleteSprintCommand, void> {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository) {}

  async execute(command: DeleteSprintCommand): Promise<void> {
    await this.sprintRepository.softDelete(command.sprintId, command.organizationId);
    await this.sprintRepository.recordSyncEvent({
      sprintId: command.sprintId,
      organizationId: command.organizationId,
      action: 'DELETE',
      status: 'SUCCESS',
      triggeredBy: command.actorId,
    });
  }
}
