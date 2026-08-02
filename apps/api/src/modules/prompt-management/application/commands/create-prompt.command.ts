import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';

export class CreatePromptCommand {
  constructor(
    public readonly capability: string,
    public readonly agentKey: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly category: string | null,
    public readonly tags: string[],
    public readonly template: string,
    public readonly jsonSchema: unknown,
    public readonly createdBy: string,
  ) {}
}

@CommandHandler(CreatePromptCommand)
export class CreatePromptHandler implements ICommandHandler<CreatePromptCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  execute(command: CreatePromptCommand): Promise<PromptEntity> {
    return this.promptRepository.create({
      capability: command.capability,
      agentKey: command.agentKey,
      name: command.name,
      description: command.description,
      category: command.category,
      tags: command.tags,
      template: command.template,
      jsonSchema: command.jsonSchema,
      createdBy: command.createdBy,
    });
  }
}
