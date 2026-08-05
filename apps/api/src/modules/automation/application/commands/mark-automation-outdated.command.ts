import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';

// Dispatched cross-module (ba-review -> automation, via CommandBus, same boundary convention as
// every other cross-module side effect in this codebase) whenever a locked story's test cases get
// regenerated -- any automation already generated against the previous content may no longer match.
export class MarkAutomationOutdatedCommand {
  constructor(public readonly testCaseIds: string[]) {}
}

@CommandHandler(MarkAutomationOutdatedCommand)
export class MarkAutomationOutdatedHandler implements ICommandHandler<MarkAutomationOutdatedCommand, void> {
  constructor(
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
  ) {}

  async execute(command: MarkAutomationOutdatedCommand): Promise<void> {
    await this.automationRepository.markOutdatedForTestCaseIds(command.testCaseIds);
  }
}
