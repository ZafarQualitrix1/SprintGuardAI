import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetJiraStoryDetailQuery } from '../application/queries/get-jira-story-detail.query';
import { ExternalIssueDetailPayload } from '../../integration/application/ports/integration-connector.port';
import { JiraStoryDetailDto } from './dto/jira-story-detail.dto';

function toDto(payload: ExternalIssueDetailPayload): JiraStoryDetailDto {
  return {
    externalId: payload.externalId,
    title: payload.title,
    description: payload.description,
    acceptanceCriteria: payload.acceptanceCriteria,
    status: payload.status,
    priority: payload.priority,
    assignee: payload.assignee,
    reporter: payload.reporter,
    labels: payload.labels,
    components: payload.components,
    epic: payload.epic,
    epicKey: payload.epicKey,
    parent: payload.parent,
    storyPoints: payload.storyPoints,
    dueDate: payload.dueDate?.toISOString() ?? null,
    createdAt: payload.createdAt?.toISOString() ?? null,
    updatedAt: payload.updatedAt?.toISOString() ?? null,
    environment: payload.environment,
    comments: payload.comments.map((c) => ({
      id: c.id,
      author: c.author,
      body: c.body,
      createdAt: c.createdAt?.toISOString() ?? null,
    })),
    attachments: payload.attachments,
    links: payload.links,
    issueType: payload.issueType,
    additionalCustomFields: payload.additionalCustomFields,
  };
}

@ApiTags('Requirement Intelligence')
@Controller('stories/:storyId/jira-detail')
export class JiraStoryDetailController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission('requirement:read')
  async get(@Param('storyId') storyId: string, @CurrentUser() user: AuthenticatedUser): Promise<JiraStoryDetailDto> {
    const payload = await this.queryBus.execute<GetJiraStoryDetailQuery, ExternalIssueDetailPayload>(
      new GetJiraStoryDetailQuery(user.organizationId, storyId),
    );
    return toDto(payload);
  }
}
