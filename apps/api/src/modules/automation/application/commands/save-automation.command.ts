import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import { AutomationGenerationEntity } from '../../domain/entities/automation-generation.entity';

export class SaveAutomationCommand {
  constructor(public readonly automationGenerationId: string) {}
}

@CommandHandler(SaveAutomationCommand)
export class SaveAutomationHandler implements ICommandHandler<SaveAutomationCommand, AutomationGenerationEntity> {
  constructor(
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
  ) {}

  async execute(command: SaveAutomationCommand): Promise<AutomationGenerationEntity> {
    const existing = await this.automationRepository.findById(command.automationGenerationId);
    if (!existing) {
      throw new NotFoundException('Automation generation not found');
    }
    return this.automationRepository.markSaved(command.automationGenerationId);
  }
}
