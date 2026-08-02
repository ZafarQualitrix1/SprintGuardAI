import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';
import { diffLines, DiffLine } from '../utils/text-diff.util';

export class ComparePromptVersionsQuery {
  constructor(
    public readonly capability: string,
    public readonly versionA: string,
    public readonly versionB: string,
  ) {}
}

export interface PromptComparisonResult {
  a: PromptEntity;
  b: PromptEntity;
  templateDiff: DiffLine[];
}

@QueryHandler(ComparePromptVersionsQuery)
export class ComparePromptVersionsHandler implements IQueryHandler<ComparePromptVersionsQuery, PromptComparisonResult> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(query: ComparePromptVersionsQuery): Promise<PromptComparisonResult> {
    const [a, b] = await Promise.all([
      this.promptRepository.findOne(query.capability, query.versionA),
      this.promptRepository.findOne(query.capability, query.versionB),
    ]);
    if (!a || !b) {
      throw new NotFoundException('One or both versions not found');
    }
    return { a, b, templateDiff: diffLines(a.template, b.template) };
  }
}
