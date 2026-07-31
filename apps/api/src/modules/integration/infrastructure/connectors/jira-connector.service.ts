import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  ConnectorCredentials,
  ExternalActiveSprintPayload,
  ExternalBoardPayload,
  ExternalProjectPayload,
  ExternalSprintPayload,
  ExternalStoryPayload,
  IIntegrationConnector,
} from '../../application/ports/integration-connector.port';
import { extractJiraBoardId, parseJiraSprintReference } from './jira-reference.util';

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
  state?: string;
}

interface JiraBoardSprintsResponse {
  values: JiraSprintResponse[];
}

interface JiraProjectResponse {
  key: string;
  name: string;
  avatarUrls?: { '48x48'?: string };
  lead?: { displayName?: string };
}

interface JiraProjectSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  isLast: boolean;
  values: JiraProjectResponse[];
}

interface JiraBoardResponse {
  id: number;
  name: string;
  type: string;
}

interface JiraBoardSearchResponse {
  values: JiraBoardResponse[];
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
const PROJECT_PAGE_SIZE = 50;

// Node's global `fetch`/`Response` ambient types resolve inconsistently across build
// environments depending on which `@types/node` copy a pnpm install happens to hoist -- this
// pins the response shape this file actually relies on so type-checking doesn't depend on that.
interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

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

    const response = (await fetch(`${jiraConfig.siteUrl}/rest/api/3/myself`, {
      headers: { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' },
    })) as unknown as FetchResponse;

    if (!response.ok) {
      throw new UnauthorizedException(
        `Jira credentials could not be verified (HTTP ${response.status}). Check the site URL, email, and API token.`,
      );
    }
  }

  // Company-managed board backlog URLs carry ?sprintId=; team-managed boards never do, so a plain
  // board URL is all those users can copy. Falls back to the board's active (or next future)
  // sprint via the Agile API rather than forcing users to hunt for an id that doesn't exist for them.
  private async resolveSprintId(
    reference: string,
    jiraConfig: JiraConfig,
    credentials: JiraCredentials,
  ): Promise<string> {
    try {
      return parseJiraSprintReference(reference);
    } catch (error) {
      const boardId = extractJiraBoardId(reference);
      if (!boardId) {
        throw error;
      }

      const sprints = await this.fetchActiveSprints(
        String(boardId),
        credentials,
        jiraConfig as unknown as Record<string, unknown>,
      );
      const sprint = sprints.find((s) => s.state === 'active') ?? sprints[0];
      if (!sprint) {
        throw new BadRequestException(
          `Board ${boardId} has no active or upcoming sprint. Paste the numeric sprint id or a URL containing ?sprintId=... instead.`,
        );
      }
      return sprint.externalId;
    }
  }

  async fetchProjects(
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalProjectPayload[]> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const projects: ExternalProjectPayload[] = [];
    let startAt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = (await fetch(
        `${jiraConfig.siteUrl}/rest/api/3/project/search?startAt=${startAt}&maxResults=${PROJECT_PAGE_SIZE}`,
        { headers },
      )) as unknown as FetchResponse;
      if (!response.ok) {
        throw new BadRequestException(`Could not list Jira projects (HTTP ${response.status}).`);
      }
      const page = (await response.json()) as JiraProjectSearchResponse;

      projects.push(
        ...page.values.map((project): ExternalProjectPayload => ({
          externalKey: project.key,
          name: project.name,
          avatarUrl: project.avatarUrls?.['48x48'] ?? null,
          lead: project.lead?.displayName ?? null,
        })),
      );

      startAt += page.values.length;
      if (page.isLast || page.values.length === 0) {
        break;
      }
    }

    return projects;
  }

  async fetchBoards(
    projectKey: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalBoardPayload[]> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const response = (await fetch(
      `${jiraConfig.siteUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}`,
      { headers },
    )) as unknown as FetchResponse;
    if (!response.ok) {
      throw new BadRequestException(`Could not list Jira boards for project ${projectKey} (HTTP ${response.status}).`);
    }
    const { values } = (await response.json()) as JiraBoardSearchResponse;
    return values.map((board): ExternalBoardPayload => ({ id: String(board.id), name: board.name, type: board.type }));
  }

  async fetchActiveSprints(
    boardId: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalActiveSprintPayload[]> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const response = (await fetch(
      `${jiraConfig.siteUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future`,
      { headers },
    )) as unknown as FetchResponse;
    if (!response.ok) {
      throw new BadRequestException(`Could not look up sprints for Jira board ${boardId} (HTTP ${response.status}).`);
    }
    const { values } = (await response.json()) as JiraBoardSprintsResponse;
    return values.map((sprint): ExternalActiveSprintPayload => ({
      externalId: String(sprint.id),
      name: sprint.name,
      state: sprint.state ?? 'unknown',
      startDate: toIsoDate(sprint.startDate),
      endDate: toIsoDate(sprint.endDate),
    }));
  }

  async fetchSprint(
    reference: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalSprintPayload> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };
    const sprintId = await this.resolveSprintId(reference, jiraConfig, jiraCredentials);

    const sprintResponse = (await fetch(`${jiraConfig.siteUrl}/rest/agile/1.0/sprint/${sprintId}`, {
      headers,
    })) as unknown as FetchResponse;
    if (!sprintResponse.ok) {
      throw new Error(`Failed to fetch Jira sprint ${sprintId} (HTTP ${sprintResponse.status})`);
    }
    const sprint = (await sprintResponse.json()) as JiraSprintResponse;

    const stories: ExternalStoryPayload[] = [];
    let startAt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const issuesResponse = (await fetch(
        `${jiraConfig.siteUrl}/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=${PAGE_SIZE}&fields=summary,description,status,assignee,priority,customfield_10016`,
        { headers },
      )) as unknown as FetchResponse;
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
