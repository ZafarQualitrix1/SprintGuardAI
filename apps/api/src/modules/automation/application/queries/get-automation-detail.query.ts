import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import { AutomationGenerationEntity } from '../../domain/entities/automation-generation.entity';

export class GetAutomationDetailQuery {
  constructor(public readonly automationGenerationId: string) {}
}

@QueryHandler(GetAutomationDetailQuery)
export class GetAutomationDetailHandler implements IQueryHandler<GetAutomationDetailQuery, AutomationGenerationEntity> {
  constructor(
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
  ) {}

  async execute(query: GetAutomationDetailQuery): Promise<AutomationGenerationEntity> {
    const entity = await this.automationRepository.findById(query.automationGenerationId);
    if (!entity) {
      throw new NotFoundException('Automation generation not found');
    }
    return entity;
  }
}
