import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import {
  ACCEPTANCE_CRITERION_READ_REPOSITORY,
  IAcceptanceCriterionReadRepository,
} from '../../domain/repositories/acceptance-criterion-read.repository.interface';
import {
  TEST_SCENARIO_REPOSITORY,
  ITestScenarioRepository,
} from '../../domain/repositories/test-scenario.repository.interface';
import {
  TEST_CASE_REPOSITORY,
  ITestCaseRepository,
} from '../../domain/repositories/test-case.repository.interface';
import { TestScenarioEntity } from '../../domain/entities/test-artifact.entity';
import { testCaseOutputSchema, testScenarioOutputSchema } from '../schemas/test-generation.schema';

export class RunTestGenerationCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

@CommandHandler(RunTestGenerationCommand)
export class RunTestGenerationHandler implements ICommandHandler<RunTestGenerationCommand, TestScenarioEntity[]> {
  constructor(
    @Inject(ACCEPTANCE_CRITERION_READ_REPOSITORY)
    private readonly acceptanceCriterionReadRepository: IAcceptanceCriterionReadRepository,
    @Inject(TEST_SCENARIO_REPOSITORY) private readonly testScenarioRepository: ITestScenarioRepository,
    @Inject(TEST_CASE_REPOSITORY) private readonly testCaseRepository: ITestCaseRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: RunTestGenerationCommand): Promise<TestScenarioEntity[]> {
    const acceptanceCriteria = await this.acceptanceCriterionReadRepository.findByStoryId(
      command.storyId,
      command.organizationId,
    );
    if (acceptanceCriteria.length === 0) {
      throw new BadRequestException(
        'No acceptance criteria found for this story. Run Requirement Intelligence first.',
      );
    }

    // Sequential, not parallel: bounds concurrent load on the configured LLM provider and keeps
    // AgentRun ordering easy to follow in the audit trail. A story typically has a handful of ACs,
    // so this is an acceptable latency trade-off for MVP scope.
    for (const ac of acceptanceCriteria) {
      const scenarioResult = await this.aiOrchestrationService.execute({
        capability: 'test-scenario',
        agentKey: 'test-scenario-agent',
        organizationId: command.organizationId,
        variables: { storyTitle: ac.storyTitle, given: ac.given, when: ac.when, then: ac.then },
        outputSchema: testScenarioOutputSchema,
      });

      const scenarios = await this.testScenarioRepository.replaceForAcceptanceCriterion(
        ac.id,
        ac.storyId,
        scenarioResult.data.scenarios,
      );

      for (const scenario of scenarios) {
        const caseResult = await this.aiOrchestrationService.execute({
          capability: 'test-case',
          agentKey: 'test-case-agent',
          organizationId: command.organizationId,
          variables: {
            scenarioTitle: scenario.title,
            scenarioDescription: scenario.description ?? 'No additional description.',
          },
          outputSchema: testCaseOutputSchema,
        });

        await this.testCaseRepository.replaceForScenario(scenario.id, caseResult.data.cases);
      }
    }

    return this.testScenarioRepository.findByStoryId(command.storyId);
  }
}
