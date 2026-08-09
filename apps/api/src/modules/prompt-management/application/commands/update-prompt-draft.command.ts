import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository, UpdateDraftInput } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';

export class UpdatePromptDraftCommand {
  constructor(
    public readonly promptId: string,
    public readonly patch: UpdateDraftInput,
  ) {}
}

@CommandHandler(UpdatePromptDraftCommand)
export class UpdatePromptDraftHandler implements ICommandHandler<UpdatePromptDraftCommand, PromptEntity> {
  constructor(
    @Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: UpdatePromptDraftCommand): Promise<PromptEntity> {
    const updated = await this.promptRepository.updateDraft(command.promptId, command.patch);
    // A cached findById(promptId) result (e.g. from a Prompt Playground test run) must not keep
    // serving this draft's previous template after an edit.
    this.aiOrchestrationService.invalidatePromptByIdCache(command.promptId);
    return updated;
  }
}
