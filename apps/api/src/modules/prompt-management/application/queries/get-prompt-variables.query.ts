import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { detectVariables } from '../utils/detect-variables.util';

export class GetPromptVariablesQuery {
  constructor(
    public readonly capability: string,
    public readonly version?: string,
  ) {}
}

@QueryHandler(GetPromptVariablesQuery)
export class GetPromptVariablesHandler implements IQueryHandler<GetPromptVariablesQuery, string[]> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(query: GetPromptVariablesQuery): Promise<string[]> {
    const prompt = query.version
      ? await this.promptRepository.findOne(query.capability, query.version)
      : (await this.promptRepository.findHistory(query.capability))[0];
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }
    return detectVariables(prompt.template);
  }
}
