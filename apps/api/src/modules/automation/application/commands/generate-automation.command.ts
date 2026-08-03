import { BadRequestException, ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import { IsStoryLockedQuery } from '../../../ba-review/application/queries/is-story-locked.query';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import {
  TEST_CASE_AUTOMATION_REPOSITORY,
  ITestCaseAutomationRepository,
} from '../../domain/repositories/test-case-automation.repository.interface';
import { AutomationFile, AutomationGenerationEntity, AutomationType } from '../../domain/entities/automation-generation.entity';
import { PlaywrightScaffoldService, PLAYWRIGHT_FRAMEWORK_VERSION, AUTOMATION_GENERATOR_VERSION } from '../../infrastructure/services/playwright-scaffold.service';
import { apiAutomationOutputSchema, uiAutomationOutputSchema } from '../schemas/automation-generation.schema';

// Also used for "Regenerate Automation" (§5) -- regeneration is simply calling this again, which
// always inserts a new version (§12 "Allow regeneration without losing previous versions").
export class GenerateAutomationCommand {
  constructor(
    public readonly organizationId: string,
    public readonly testCaseId: string,
    public readonly automationType: AutomationType,
    public readonly actorId: string,
  ) {}
}

@CommandHandler(GenerateAutomationCommand)
export class GenerateAutomationHandler implements ICommandHandler<GenerateAutomationCommand, AutomationGenerationEntity> {
  constructor(
    @Inject(TEST_CASE_AUTOMATION_REPOSITORY) private readonly testCaseRepository: ITestCaseAutomationRepository,
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
    private readonly scaffoldService: PlaywrightScaffoldService,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: GenerateAutomationCommand): Promise<AutomationGenerationEntity> {
    const testCase = await this.testCaseRepository.findById(command.testCaseId, command.organizationId);
    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    const isLocked = await this.queryBus.execute<IsStoryLockedQuery, boolean>(
      new IsStoryLockedQuery(command.organizationId, testCase.storyId),
    );
    if (isLocked) {
      throw new ForbiddenException(
        'This story is BA-approved and locked. An Admin must unlock it before generating automation.',
      );
    }

    if (testCase.automationStatus === 'MANUAL') {
      throw new BadRequestException(
        'This test case is not marked automatable. Regenerate it from Test Generation with automation enabled first.',
      );
    }

    const stepsJson = JSON.stringify(testCase.steps);
    const testCaseDescription = testCase.description ?? testCase.title;

    if (command.automationType === 'API') {
      // Explicit: capabilities without a provider fall through to the deployment's
      // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
      // before -- pinning to the one with a real, working key avoids depending on that.
      const result = await this.aiOrchestrationService.execute({
        capability: 'playwright-api-automation',
        agentKey: 'playwright-api-automation-agent',
        organizationId: command.organizationId,
        provider: 'groq',
        variables: {
          storyTitle: testCase.storyTitle,
          testCaseTitle: testCase.title,
          testCaseDescription,
          stepsJson,
          apiEndpoint: testCase.apiEndpoint ?? '',
          testDataJson: JSON.stringify(testCase.testData ?? {}),
        },
        outputSchema: apiAutomationOutputSchema,
      });

      const files: AutomationFile[] = [
        ...this.scaffoldService.buildApiFrameworkFiles(),
        { path: `tests/api/${result.data.testFileName}`, content: result.data.testFileContent },
      ];

      const generation = await this.automationRepository.createNextVersion({
        testCaseId: command.testCaseId,
        automationType: 'API',
        frameworkVersion: PLAYWRIGHT_FRAMEWORK_VERSION,
        generatorVersion: AUTOMATION_GENERATOR_VERSION,
        aiModelVersion: `${result.provider}/${result.model}`,
        files,
        automationReadinessScore: result.data.automationReadinessScore,
        estimatedEffortHours: result.data.estimatedEffortHours,
        complexityLevel: result.data.complexityLevel,
        requiredPreconditions: result.data.requiredPreconditions,
        missingRequirementDetails: result.data.missingRequirementDetails,
        generatedByAgentRunId: result.agentRunId,
        createdBy: command.actorId,
      });

      await this.testCaseRepository.markAutomated(command.testCaseId);
      return generation;
    }

    // Explicit: capabilities without a provider fall through to the deployment's
    // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
    // before -- pinning to the one with a real, working key avoids depending on that.
    const result = await this.aiOrchestrationService.execute({
      capability: 'playwright-ui-automation',
      agentKey: 'playwright-ui-automation-agent',
      organizationId: command.organizationId,
      provider: 'groq',
      variables: {
        storyTitle: testCase.storyTitle,
        testCaseTitle: testCase.title,
        testCaseDescription,
        stepsJson,
        uiScreen: testCase.uiScreen ?? '',
      },
      outputSchema: uiAutomationOutputSchema,
    });

    const files: AutomationFile[] = [
      ...this.scaffoldService.buildUiFrameworkFiles(),
      { path: `src/pages/${result.data.pageObjectFileName}`, content: result.data.pageObjectFileContent },
      { path: `tests/ui/${result.data.testFileName}`, content: result.data.testFileContent },
    ];

    const generation = await this.automationRepository.createNextVersion({
      testCaseId: command.testCaseId,
      automationType: 'UI',
      frameworkVersion: PLAYWRIGHT_FRAMEWORK_VERSION,
      generatorVersion: AUTOMATION_GENERATOR_VERSION,
      aiModelVersion: `${result.provider}/${result.model}`,
      files,
      automationReadinessScore: result.data.automationReadinessScore,
      estimatedEffortHours: result.data.estimatedEffortHours,
      complexityLevel: result.data.complexityLevel,
      requiredPreconditions: result.data.requiredPreconditions,
      missingRequirementDetails: result.data.missingRequirementDetails,
      generatedByAgentRunId: result.agentRunId,
      createdBy: command.actorId,
    });

    await this.testCaseRepository.markAutomated(command.testCaseId);
    return generation;
  }
}
