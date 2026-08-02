import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';

export class CreatePromptVersionCommand {
  constructor(
    public readonly capability: string,
    public readonly template: string,
    public readonly jsonSchema: unknown,
    public readonly name: string | null,
    public readonly description: string | null,
    public readonly category: string | null,
    public readonly tags: string[] | null,
    public readonly changeSummary: string | null,
    public readonly createdBy: string,
  ) {}
}

@CommandHandler(CreatePromptVersionCommand)
export class CreatePromptVersionHandler implements ICommandHandler<CreatePromptVersionCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  execute(command: CreatePromptVersionCommand): Promise<PromptEntity> {
    return this.promptRepository.createVersion(command.capability, {
      template: command.template,
      jsonSchema: command.jsonSchema,
      name: command.name,
      description: command.description,
      category: command.category,
      tags: command.tags ?? undefined,
      changeSummary: command.changeSummary,
      createdBy: command.createdBy,
    });
  }
}
