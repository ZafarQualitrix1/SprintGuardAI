import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository, PromptListFilter } from '../../domain/repositories/prompt.repository.interface';
import { PromptLibraryRow } from '../../domain/entities/prompt.entity';

export class ListPromptsQuery {
  constructor(public readonly filter: PromptListFilter) {}
}

@QueryHandler(ListPromptsQuery)
export class ListPromptsHandler implements IQueryHandler<ListPromptsQuery, { rows: PromptLibraryRow[]; total: number }> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  execute(query: ListPromptsQuery) {
    return this.promptRepository.list(query.filter);
  }
}
