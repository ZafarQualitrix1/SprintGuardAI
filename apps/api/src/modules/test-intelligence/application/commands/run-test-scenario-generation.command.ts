import { BadRequestException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import { IsStoryLockedQuery } from '../../../ba-review/application/queries/is-story-locked.query';
import {
  ACCEPTANCE_CRITERION_READ_REPOSITORY,
  IAcceptanceCriterionReadRepository,
} from '../../domain/repositories/acceptance-criterion-read.repository.interface';
import {
  TEST_SCENARIO_REPOSITORY,
  ITestScenarioRepository,
} from '../../domain/repositories/test-scenario.repository.interface';
import { TestScenarioEntity } from '../../domain/entities/test-artifact.entity';
import { testScenarioOutputSchema } from '../schemas/test-generation.schema';
import { RunRequirementIntelligenceAgentCommand } from '../../../requirement-intelligence/application/commands/run-requirement-intelligence-agent.command';

// "Generate Test Scenarios" -- high-level scenarios only (no step-by-step test cases). Split from
// the combined RunTestGenerationCommand so a user can generate/review scenarios independently
// before committing to full test-case generation.
export class RunTestScenarioGenerationCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly actorId: string | null = null,
  ) {}
}

@CommandHandler(RunTestScenarioGenerationCommand)
export class RunTestScenarioGenerationHandler
  implements ICommandHandler<RunTestScenarioGenerationCommand, TestScenarioEntity[]>
{
  private readonly logger = new Logger(RunTestScenarioGenerationHandler.name);

  constructor(
    @Inject(ACCEPTANCE_CRITERION_READ_REPOSITORY)
    private readonly acceptanceCriterionReadRepository: IAcceptanceCriterionReadRepository,
    @Inject(TEST_SCENARIO_REPOSITORY) private readonly testScenarioRepository: ITestScenarioRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RunTestScenarioGenerationCommand): Promise<TestScenarioEntity[]> {
    const isLocked = await this.queryBus.execute<IsStoryLockedQuery, boolean>(
      new IsStoryLockedQuery(command.organizationId, command.storyId),
    );
    if (isLocked) {
      throw new ForbiddenException(
        'Test cases for this story are BA-approved and locked. An Admin must unlock it before regenerating.',
      );
    }

    let acceptanceCriteria = await this.acceptanceCriterionReadRepository.findByStoryId(
      command.storyId,
      command.organizationId,
    );

    // Bug 4: never fail outright just because Acceptance Criteria haven't been extracted yet --
    // priority sequence is AC -> Description -> Business Rules -> AI Requirement Analysis. Running
    // the Requirement Intelligence agent (which reads the story's description and infers
    // requirements/AC, business rules included) covers all three fallback sources in one call,
    // since that's the exact same pipeline "Analyze story" already uses.
    if (acceptanceCriteria.length === 0) {
      this.logger.log(
        `No acceptance criteria for story ${command.storyId} -- inferring from description via Requirement Intelligence before generating scenarios.`,
      );
      await this.commandBus.execute(
        new RunRequirementIntelligenceAgentCommand(command.organizationId, command.storyId),
      );
      acceptanceCriteria = await this.acceptanceCriterionReadRepository.findByStoryId(
        command.storyId,
        command.organizationId,
      );
    }

    if (acceptanceCriteria.length === 0) {
      throw new BadRequestException(
        'Could not derive acceptance criteria for this story, even from its description. Add a description or acceptance criteria in Jira and try again.',
      );
    }

    // Sequential, not parallel: bounds concurrent load on the configured LLM provider and keeps
    // AgentRun ordering easy to follow in the audit trail. A story typically has a handful of ACs,
    // so this is an acceptable latency trade-off for MVP scope.
    for (const ac of acceptanceCriteria) {
      // Explicit: capabilities without a provider fall through to the deployment's
      // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
      // before -- pinning to the one with a real, working key avoids depending on that.
      const scenarioResult = await this.aiOrchestrationService.execute({
        capability: 'test-scenario',
        agentKey: 'test-scenario-agent',
        organizationId: command.organizationId,
        provider: 'groq',
        variables: { storyTitle: ac.storyTitle, given: ac.given, when: ac.when, then: ac.then },
        outputSchema: testScenarioOutputSchema,
        // Stable per-acceptance-criterion key: rejects a second concurrent generation for the same
        // AC (e.g. an overlapping "Generate Test Scenarios" click) instead of racing this call's
        // replaceForAcceptanceCriterion() write.
        correlationId: `test-scenario:${ac.id}`,
      });

      await this.testScenarioRepository.replaceForAcceptanceCriterion(ac.id, ac.storyId, scenarioResult.data.scenarios);
    }

    return this.testScenarioRepository.findByStoryId(command.storyId);
  }
}
