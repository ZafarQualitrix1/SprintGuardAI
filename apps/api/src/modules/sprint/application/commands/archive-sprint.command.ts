import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SPRINT_REPOSITORY, ISprintRepository } from '../../domain/repositories/sprint.repository.interface';
import { SprintEntity } from '../../domain/entities/sprint.entity';

export class ArchiveSprintCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly sprintId: string,
    public readonly archived: boolean,
  ) {}
}

@CommandHandler(ArchiveSprintCommand)
export class ArchiveSprintHandler implements ICommandHandler<ArchiveSprintCommand, SprintEntity> {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository) {}

  async execute(command: ArchiveSprintCommand): Promise<SprintEntity> {
    const sprint = await this.sprintRepository.setArchived(command.sprintId, command.organizationId, command.archived);
    await this.sprintRepository.recordSyncEvent({
      sprintId: command.sprintId,
      organizationId: command.organizationId,
      action: command.archived ? 'ARCHIVE' : 'UNARCHIVE',
      status: 'SUCCESS',
      triggeredBy: command.actorId,
    });
    return sprint;
  }
}
