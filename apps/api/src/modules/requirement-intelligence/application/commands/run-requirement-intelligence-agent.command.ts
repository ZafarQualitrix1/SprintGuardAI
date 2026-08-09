import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import { IsStoryLockedQuery } from '../../../ba-review/application/queries/is-story-locked.query';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '../../domain/repositories/requirement.repository.interface';
import {
  STORY_READ_REPOSITORY,
  IStoryReadRepository,
} from '../../domain/repositories/story-read.repository.interface';
import { RequirementEntity } from '../../domain/entities/requirement.entity';
import { requirementIntelligenceOutputSchema } from '../schemas/requirement-intelligence.schema';
import { ReleaseMetricsChangedEvent } from '../../../release/domain/events/release-metrics-changed.event';

export class RunRequirementIntelligenceAgentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

@CommandHandler(RunRequirementIntelligenceAgentCommand)
export class RunRequirementIntelligenceAgentHandler
  implements ICommandHandler<RunRequirementIntelligenceAgentCommand, RequirementEntity[]>
{
  constructor(
    @Inject(STORY_READ_REPOSITORY) private readonly storyReadRepository: IStoryReadRepository,
    @Inject(REQUIREMENT_REPOSITORY) private readonly requirementRepository: IRequirementRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RunRequirementIntelligenceAgentCommand): Promise<RequirementEntity[]> {
    const isLocked = await this.queryBus.execute<IsStoryLockedQuery, boolean>(
      new IsStoryLockedQuery(command.organizationId, command.storyId),
    );
    if (isLocked) {
      throw new ForbiddenException(
        'Test cases for this story are BA-approved and locked. An Admin must unlock it before regenerating requirements.',
      );
    }

    const story = await this.storyReadRepository.findById(command.storyId, command.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const result = await this.aiOrchestrationService.execute({
      capability: 'requirement-intelligence',
      agentKey: 'requirement-intelligence-agent',
      organizationId: command.organizationId,
      // Explicit, matching run-deep-requirement-analysis.command.ts: this capability has no
      // org-level AiProviderConfig/ModuleAiConfig override anywhere, so leaving it unset falls
      // through to the environment's global AI_DEFAULT_PROVIDER -- which is Anthropic with no
      // configured key, not the Groq key this project actually has.
      provider: 'groq',
      variables: { storyTitle: story.title, storyDescription: story.description ?? 'No description provided.' },
      outputSchema: requirementIntelligenceOutputSchema,
      // Stable per-story key: this command is fired both directly and fire-and-forget from
      // run-deep-requirement-analysis -- a second concurrent call for the same story (double-click,
      // or an overlapping deep-analysis trigger) gets rejected with a clear 409 instead of racing the
      // first call's replaceForStory() write.
      correlationId: `requirement-intelligence:${command.storyId}`,
    });

    const requirements = result.data.requirements.map((requirement) => ({
      text: requirement.text,
      type: requirement.type,
      confidenceScore: result.confidenceScore,
      acceptanceCriteria: requirement.acceptanceCriteria,
    }));

    const saved = await this.requirementRepository.replaceForStory(story.id, requirements);
    this.eventBus.publish(
      new ReleaseMetricsChangedEvent(command.organizationId, story.sprintId, 'requirement-added'),
    );
    return saved;
  }
}
