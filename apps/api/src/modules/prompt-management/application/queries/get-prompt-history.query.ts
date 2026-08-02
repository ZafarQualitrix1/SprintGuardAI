import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';

export class GetPromptHistoryQuery {
  constructor(public readonly capability: string) {}
}

@QueryHandler(GetPromptHistoryQuery)
export class GetPromptHistoryHandler implements IQueryHandler<GetPromptHistoryQuery, PromptEntity[]> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  execute(query: GetPromptHistoryQuery): Promise<PromptEntity[]> {
    return this.promptRepository.findHistory(query.capability);
  }
}
