import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import { FetchExternalIssueDetailQuery } from '../../../integration/application/queries/fetch-external-issue-detail.query';
import { ExternalIssueDetailPayload } from '../../../integration/application/ports/integration-connector.port';
import {
  STORY_READ_REPOSITORY,
  IStoryReadRepository,
} from '../../domain/repositories/story-read.repository.interface';
import {
  REQUIREMENT_ANALYSIS_REPORT_REPOSITORY,
  IRequirementAnalysisReportRepository,
} from '../../domain/repositories/requirement-analysis-report.repository.interface';
import { RequirementAnalysisReportEntity } from '../../domain/entities/requirement-analysis-report.entity';
import {
  DeepRequirementAnalysisOutput,
  deepRequirementAnalysisOutputSchema,
} from '../schemas/deep-requirement-analysis.schema';
import { buildStoryContext } from '../utils/story-context-builder';
import { RunRequirementIntelligenceAgentCommand } from './run-requirement-intelligence-agent.command';

export class RunDeepRequirementAnalysisCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly storyId: string,
  ) {}
}

@CommandHandler(RunDeepRequirementAnalysisCommand)
export class RunDeepRequirementAnalysisHandler
  implements ICommandHandler<RunDeepRequirementAnalysisCommand, RequirementAnalysisReportEntity>
{
  private readonly logger = new Logger(RunDeepRequirementAnalysisHandler.name);

  constructor(
    @Inject(STORY_READ_REPOSITORY) private readonly storyReadRepository: IStoryReadRepository,
    @Inject(REQUIREMENT_ANALYSIS_REPORT_REPOSITORY)
    private readonly reportRepository: IRequirementAnalysisReportRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RunDeepRequirementAnalysisCommand): Promise<RequirementAnalysisReportEntity> {
    const story = await this.storyReadRepository.findById(command.storyId, command.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (!story.externalId || !story.sourceConnectionId) {
      throw new BadRequestException(
        'This story has no live Jira connection to re-fetch from. Re-import its sprint from Jira to enable deep analysis.',
      );
    }

    // Keeps the normalized Requirement/AcceptanceCriterion tables (and therefore the Coverage
    // tab) populated exactly as the existing "Analyze story" flow always has -- fire-and-forget so
    // a failure here never blocks the deep-analysis result the user is waiting on.
    this.commandBus
      .execute(new RunRequirementIntelligenceAgentCommand(command.organizationId, command.storyId))
      .catch((error) => this.logger.warn(`Lightweight requirement extraction failed for story ${command.storyId}: ${error}`));

    const issue = await this.queryBus.execute<FetchExternalIssueDetailQuery, ExternalIssueDetailPayload>(
      new FetchExternalIssueDetailQuery(command.organizationId, story.sourceConnectionId, story.externalId),
    );

    const storyContext = buildStoryContext(issue);

    const result = await this.aiOrchestrationService.execute<DeepRequirementAnalysisOutput>({
      capability: 'deep-requirement-analysis',
      agentKey: 'deep-requirement-analysis-agent',
      organizationId: command.organizationId,
      variables: { storyContext },
      outputSchema: deepRequirementAnalysisOutputSchema,
      provider: 'groq',
    });

    return this.reportRepository.createNewVersion({
      storyId: story.id,
      sprintId: story.sprintId,
      organizationId: command.organizationId,
      aiProvider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
      generatedBy: command.actorId,
      output: result.data,
      confidenceScore: result.confidenceScore,
      generatedByAgentRunId: result.agentRunId,
      jiraSnapshot: issue as unknown as Record<string, unknown>,
    });
  }
}
