import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SPRINT_REPOSITORY, ISprintRepository } from '../../domain/repositories/sprint.repository.interface';
import { SprintEntity } from '../../domain/entities/sprint.entity';

export class RenameSprintCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly sprintId: string,
    public readonly name: string,
  ) {}
}

@CommandHandler(RenameSprintCommand)
export class RenameSprintHandler implements ICommandHandler<RenameSprintCommand, SprintEntity> {
  constructor(@Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository) {}

  async execute(command: RenameSprintCommand): Promise<SprintEntity> {
    const sprint = await this.sprintRepository.rename(command.sprintId, command.organizationId, command.name);
    await this.sprintRepository.recordSyncEvent({
      sprintId: command.sprintId,
      organizationId: command.organizationId,
      action: 'RENAME',
      status: 'SUCCESS',
      triggeredBy: command.actorId,
    });
    return sprint;
  }
}
