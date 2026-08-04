import { BadRequestException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import { IsStoryLockedQuery } from '../../../ba-review/application/queries/is-story-locked.query';
import { TriggerBaReviewCommand } from '../../../ba-review/application/commands/trigger-ba-review.command';
import { TestCaseSnapshotEntry } from '../../../ba-review/domain/entities/ba-review-cycle.entity';
import {
  TEST_SCENARIO_REPOSITORY,
  ITestScenarioRepository,
} from '../../domain/repositories/test-scenario.repository.interface';
import {
  TEST_CASE_REPOSITORY,
  ITestCaseRepository,
} from '../../domain/repositories/test-case.repository.interface';
import { TestScenarioEntity } from '../../domain/entities/test-artifact.entity';
import { testCaseOutputSchema } from '../schemas/test-generation.schema';

// "Generate Test Cases" -- expands each existing scenario into full executable test cases with
// steps. Split from the combined RunTestGenerationCommand; requires scenarios to already exist
// (via RunTestScenarioGenerationCommand). Fires the automatic BA review submission on completion,
// same as the combined command used to.
export class RunTestCaseGenerationCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly actorId: string | null = null,
  ) {}
}

@CommandHandler(RunTestCaseGenerationCommand)
export class RunTestCaseGenerationHandler implements ICommandHandler<RunTestCaseGenerationCommand, TestScenarioEntity[]> {
  private readonly logger = new Logger(RunTestCaseGenerationHandler.name);

  constructor(
    @Inject(TEST_SCENARIO_REPOSITORY) private readonly testScenarioRepository: ITestScenarioRepository,
    @Inject(TEST_CASE_REPOSITORY) private readonly testCaseRepository: ITestCaseRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RunTestCaseGenerationCommand): Promise<TestScenarioEntity[]> {
    const isLocked = await this.queryBus.execute<IsStoryLockedQuery, boolean>(
      new IsStoryLockedQuery(command.organizationId, command.storyId),
    );
    if (isLocked) {
      throw new ForbiddenException(
        'Test cases for this story are BA-approved and locked. An Admin must unlock it before regenerating.',
      );
    }

    const scenarios = await this.testScenarioRepository.findByStoryId(command.storyId);
    if (scenarios.length === 0) {
      throw new BadRequestException('Generate test scenarios for this story first.');
    }

    // Sequential, not parallel: bounds concurrent load on the configured LLM provider and keeps
    // AgentRun ordering easy to follow in the audit trail.
    let lastProvider = '';
    let lastModel = '';
    let lastPromptVersion = '';

    for (const scenario of scenarios) {
      // Explicit: capabilities without a provider fall through to the deployment's
      // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
      // before -- pinning to the one with a real, working key avoids depending on that.
      const caseResult = await this.aiOrchestrationService.execute({
        capability: 'test-case',
        agentKey: 'test-case-agent',
        organizationId: command.organizationId,
        provider: 'groq',
        variables: {
          scenarioTitle: scenario.title,
          scenarioDescription: scenario.description ?? 'No additional description.',
        },
        outputSchema: testCaseOutputSchema,
      });

      await this.testCaseRepository.replaceForScenario(scenario.id, command.storyId, caseResult.data.cases);
      lastProvider = caseResult.provider;
      lastModel = caseResult.model;
      lastPromptVersion = caseResult.promptVersion;
    }

    const finalScenarios = await this.testScenarioRepository.findByStoryId(command.storyId);

    // BA Review Workflow: every fresh generation must be submitted for mandatory BA approval.
    // Fire-and-forget -- Jira comment/attachment posting is a slower, network-flaky side effect
    // that must never make this command's caller (the "Generate tests" HTTP request) fail or hang.
    if (finalScenarios.length > 0) {
      const testCasesSnapshot: TestCaseSnapshotEntry[] = finalScenarios.map((scenario) => ({
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        testCases: scenario.testCases.map((testCase) => ({
          id: testCase.id,
          title: testCase.title,
          description: testCase.description,
          steps: testCase.steps,
          priority: testCase.priority,
          severity: testCase.severity,
          testType: testCase.testType,
          automationStatus: testCase.automationStatus,
          displayId: testCase.displayId,
          testObjective: testCase.testObjective,
          preconditions: testCase.preconditions,
          dependencies: testCase.dependencies,
          requestMethod: testCase.requestMethod,
          requestPayload: testCase.requestPayload,
          expectedStatusCode: testCase.expectedStatusCode,
          expectedResponse: testCase.expectedResponse,
          remarks: testCase.remarks,
        })),
      }));

      this.commandBus
        .execute(
          new TriggerBaReviewCommand(
            command.organizationId,
            command.storyId,
            command.actorId,
            testCasesSnapshot,
            lastProvider,
            lastModel,
            lastPromptVersion,
          ),
        )
        .catch((error) => this.logger.warn(`BA review submission failed for story ${command.storyId}: ${error}`));
    }

    return finalScenarios;
  }
}
