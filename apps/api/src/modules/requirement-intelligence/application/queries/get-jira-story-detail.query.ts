import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler, QueryBus } from '@nestjs/cqrs';
import { FetchExternalIssueDetailQuery } from '../../../integration/application/queries/fetch-external-issue-detail.query';
import { ExternalIssueDetailPayload } from '../../../integration/application/ports/integration-connector.port';
import {
  STORY_READ_REPOSITORY,
  IStoryReadRepository,
} from '../../domain/repositories/story-read.repository.interface';

// Bug 4: "View Full Story" drawer on the Test Generator page -- every Jira field for the story
// (labels, components, epic, reporter, comments, attachments, etc.), fetched live rather than
// cached, same live re-fetch RunDeepRequirementAnalysisHandler already does.
export class GetJiraStoryDetailQuery {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

@QueryHandler(GetJiraStoryDetailQuery)
export class GetJiraStoryDetailHandler implements IQueryHandler<GetJiraStoryDetailQuery, ExternalIssueDetailPayload> {
  constructor(
    @Inject(STORY_READ_REPOSITORY) private readonly storyReadRepository: IStoryReadRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetJiraStoryDetailQuery): Promise<ExternalIssueDetailPayload> {
    const story = await this.storyReadRepository.findById(query.storyId, query.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (!story.externalId || !story.sourceConnectionId) {
      throw new BadRequestException(
        'This story has no live Jira connection to fetch from. Re-import its sprint from Jira to view full story details.',
      );
    }

    return this.queryBus.execute<FetchExternalIssueDetailQuery, ExternalIssueDetailPayload>(
      new FetchExternalIssueDetailQuery(query.organizationId, story.sourceConnectionId, story.externalId),
    );
  }
}
