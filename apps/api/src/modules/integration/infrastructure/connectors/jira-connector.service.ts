import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  ConnectorCredentials,
  ExternalSprintPayload,
  ExternalStoryPayload,
  IIntegrationConnector,
} from '../../application/ports/integration-connector.port';
import { parseJiraSprintReference } from './jira-reference.util';

interface JiraCredentials extends ConnectorCredentials {
  email: string;
  apiToken: string;
}

interface JiraConfig {
  siteUrl: string;
}

interface JiraSprintResponse {
  id: number;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

interface JiraAdfNode {
  type?: string;
  text?: string;
  content?: JiraAdfNode[];
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string | JiraAdfNode | null;
    status?: { name?: string };
    assignee?: { displayName?: string } | null;
    priority?: { name?: string } | null;
    // Jira Cloud's default Story Points field id -- varies per instance; treated as
    // best-effort. A future Organization Settings mapping can override this per connection.
    customfield_10016?: number | null;
  };
}

interface JiraIssueSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

const MAX_ISSUES = 500;
const PAGE_SIZE = 100;

function extractPlainText(node: string | JiraAdfNode | null | undefined): string | null {
  if (!node) return null;
  if (typeof node === 'string') return node;

  const parts: string[] = [];
  const walk = (n: JiraAdfNode) => {
    if (n.text) parts.push(n.text);
    n.content?.forEach(walk);
  };
  walk(node);
  return parts.length > 0 ? parts.join(' ') : null;
}

function toIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class JiraConnectorService implements IIntegrationConnector {
  readonly key = 'jira';

  private authHeader(credentials: JiraCredentials): string {
    const token = Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString('base64');
    return `Basic ${token}`;
  }

  async verifyCredentials(credentials: ConnectorCredentials, config: Record<string, unknown>): Promise<void> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;

    const response = await fetch(`${jiraConfig.siteUrl}/rest/api/3/myself`, {
      headers: { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new UnauthorizedException(
        `Jira credentials could not be verified (HTTP ${response.status}). Check the site URL, email, and API token.`,
      );
    }
  }

  async fetchSprint(
    reference: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalSprintPayload> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const sprintId = parseJiraSprintReference(reference);
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const sprintResponse = await fetch(`${jiraConfig.siteUrl}/rest/agile/1.0/sprint/${sprintId}`, {
      headers,
    });
    if (!sprintResponse.ok) {
      throw new Error(`Failed to fetch Jira sprint ${sprintId} (HTTP ${sprintResponse.status})`);
    }
    const sprint = (await sprintResponse.json()) as JiraSprintResponse;

    const stories: ExternalStoryPayload[] = [];
    let startAt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const issuesResponse = await fetch(
        `${jiraConfig.siteUrl}/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=${PAGE_SIZE}&fields=summary,description,status,assignee,priority,customfield_10016`,
        { headers },
      );
      if (!issuesResponse.ok) {
        throw new Error(`Failed to fetch issues for Jira sprint ${sprintId} (HTTP ${issuesResponse.status})`);
      }
      const page = (await issuesResponse.json()) as JiraIssueSearchResponse;

      stories.push(
        ...page.issues.map((issue): ExternalStoryPayload => ({
          externalId: issue.key,
          title: issue.fields.summary,
          description: extractPlainText(issue.fields.description ?? null),
          storyPoints: issue.fields.customfield_10016 ?? null,
          status: issue.fields.status?.name ?? 'Unknown',
          priority: issue.fields.priority?.name ?? null,
          assignee: issue.fields.assignee?.displayName ?? null,
        })),
      );

      startAt += page.issues.length;
      if (page.issues.length === 0 || startAt >= page.total || startAt >= MAX_ISSUES) {
        break;
      }
    }

    return {
      externalId: String(sprint.id),
      name: sprint.name,
      goal: sprint.goal ?? null,
      startDate: toIsoDate(sprint.startDate),
      endDate: toIsoDate(sprint.endDate),
      stories,
    };
  }
}
