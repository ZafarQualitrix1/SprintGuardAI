import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository, UpdateDraftInput } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';

export class UpdatePromptDraftCommand {
  constructor(
    public readonly promptId: string,
    public readonly patch: UpdateDraftInput,
  ) {}
}

@CommandHandler(UpdatePromptDraftCommand)
export class UpdatePromptDraftHandler implements ICommandHandler<UpdatePromptDraftCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  execute(command: UpdatePromptDraftCommand): Promise<PromptEntity> {
    return this.promptRepository.updateDraft(command.promptId, command.patch);
  }
}
