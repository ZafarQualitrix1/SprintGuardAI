import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';

// Clone doubles as the "template" mechanism the spec asks for -- any existing prompt (including
// one of the 6 seeded ones) can be cloned into a fresh DRAFT, either as the next version of the
// same capability or, given `asNewCapability`, as the starting point for a brand-new prompt.
export class ClonePromptCommand {
  constructor(
    public readonly sourcePromptId: string,
    public readonly createdBy: string,
    public readonly asNewCapability?: { capability: string; agentKey: string },
  ) {}
}

@CommandHandler(ClonePromptCommand)
export class ClonePromptHandler implements ICommandHandler<ClonePromptCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(command: ClonePromptCommand): Promise<PromptEntity> {
    const source = await this.promptRepository.findById(command.sourcePromptId);
    if (!source) {
      throw new NotFoundException('Source prompt not found');
    }

    if (command.asNewCapability) {
      return this.promptRepository.create({
        capability: command.asNewCapability.capability,
        agentKey: command.asNewCapability.agentKey,
        name: source.name ? `${source.name} (Copy)` : null,
        description: source.description,
        category: source.category,
        tags: source.tags,
        template: source.template,
        jsonSchema: source.jsonSchema,
        createdBy: command.createdBy,
      });
    }

    if (source.status === 'DEPRECATED') {
      throw new BadRequestException('Cannot clone a deprecated prompt into a new version of itself -- clone as a new capability instead.');
    }

    return this.promptRepository.createVersion(source.capability, {
      template: source.template,
      jsonSchema: source.jsonSchema,
      name: source.name,
      description: source.description,
      category: source.category,
      tags: source.tags,
      changeSummary: `Cloned from ${source.version}`,
      createdBy: command.createdBy,
    });
  }
}
