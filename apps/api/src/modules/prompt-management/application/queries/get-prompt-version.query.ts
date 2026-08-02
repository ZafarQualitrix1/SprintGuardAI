import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';

export class GetPromptVersionQuery {
  constructor(
    public readonly capability: string,
    public readonly version: string,
  ) {}
}

@QueryHandler(GetPromptVersionQuery)
export class GetPromptVersionHandler implements IQueryHandler<GetPromptVersionQuery, PromptEntity | null> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  execute(query: GetPromptVersionQuery): Promise<PromptEntity | null> {
    return this.promptRepository.findOne(query.capability, query.version);
  }
}
