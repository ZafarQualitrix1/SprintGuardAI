import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
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
  ) {}

  async execute(command: RunRequirementIntelligenceAgentCommand): Promise<RequirementEntity[]> {
    const story = await this.storyReadRepository.findById(command.storyId, command.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const result = await this.aiOrchestrationService.execute({
      capability: 'requirement-intelligence',
      agentKey: 'requirement-intelligence-agent',
      organizationId: command.organizationId,
      variables: { storyTitle: story.title, storyDescription: story.description ?? 'No description provided.' },
      outputSchema: requirementIntelligenceOutputSchema,
    });

    const requirements = result.data.requirements.map((requirement) => ({
      text: requirement.text,
      type: requirement.type,
      confidenceScore: result.confidenceScore,
      acceptanceCriteria: requirement.acceptanceCriteria,
    }));

    return this.requirementRepository.replaceForStory(story.id, requirements);
  }
}
