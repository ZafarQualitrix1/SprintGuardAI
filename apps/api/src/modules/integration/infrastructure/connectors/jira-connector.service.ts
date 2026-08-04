import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  ConnectorCredentials,
  ExternalActiveSprintPayload,
  ExternalBoardPayload,
  ExternalIssueAttachmentPayload,
  ExternalIssueCommentPayload,
  ExternalIssueDetailPayload,
  ExternalIssueSummaryPayload,
  ExternalProjectPayload,
  ExternalSprintPayload,
  ExternalStoryPayload,
  ExternalUserMatch,
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
  attrs?: { id?: string; [key: string]: unknown };
}

interface JiraFieldMeta {
  id: string;
  name: string;
  custom: boolean;
}

interface JiraIssueLinkResponse {
  type?: { name?: string };
  outwardIssue?: { key: string };
  inwardIssue?: { key: string };
}

interface JiraIssueDetailFields {
  summary: string;
  description?: string | JiraAdfNode | null;
  status?: { name?: string };
  assignee?: { displayName?: string } | null;
  reporter?: { displayName?: string } | null;
  priority?: { name?: string } | null;
  labels?: string[];
  components?: { name: string }[];
  duedate?: string | null;
  created?: string;
  updated?: string;
  environment?: string | JiraAdfNode | null;
  parent?: { key: string; fields?: { summary?: string; issuetype?: { name?: string } } };
  comment?: { comments: JiraCommentResponse[] };
  attachment?: JiraAttachmentResponse[];
  issuetype?: { name?: string };
  issuelinks?: JiraIssueLinkResponse[];
  [customFieldOrStandardKey: string]: unknown;
}

interface JiraCommentResponse {
  id: string;
  author?: { accountId?: string; displayName?: string; avatarUrls?: Record<string, string> };
  body?: string | JiraAdfNode;
  created?: string;
}

interface JiraAttachmentResponse {
  id: string;
  filename: string;
  mimeType?: string;
  size?: number;
  content?: string;
}

interface JiraCreatedCommentResponse {
  id: string;
}

interface JiraCreatedAttachmentResponse {
  id: string;
}

interface JiraUserSearchResult {
  accountId: string;
  displayName: string;
  avatarUrls?: Record<string, string>;
}

interface JiraIssueDetailResponse {
  key: string;
  fields: JiraIssueDetailFields;
}

const MAX_COMMENTS = 50;

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

// Lightweight per-issue shape for Smart Import's picker (§2) -- summary,issuetype,parent,labels,
// assignee only, so the picker's initial fetch stays cheap even for a large sprint.
interface JiraIssueSummary {
  key: string;
  fields: {
    summary: string;
    issuetype?: { name?: string };
    parent?: { key: string; fields?: { summary?: string; issuetype?: { name?: string } } };
    labels?: string[];
    assignee?: { displayName?: string } | null;
  };
}

interface JiraIssueSummarySearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssueSummary[];
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

// Unlike extractPlainText (a lossy flat join kept as-is for fetchSprint's existing contract), this
// preserves paragraph breaks and bullet prefixes so an AI prompt can still tell a list from a
// sentence -- still discards marks/links, just keeps block-level structure.
const BLOCK_NODE_TYPES = new Set(['paragraph', 'heading', 'codeBlock', 'blockquote']);

function adfToStructuredText(node: string | JiraAdfNode | null | undefined): string | null {
  if (!node) return null;
  if (typeof node === 'string') return node;

  const lines: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) lines.push(current.trim());
    current = '';
  };

  const walk = (n: JiraAdfNode, listPrefix: string | null) => {
    if (n.type === 'listItem') {
      flush();
      current = listPrefix ?? '- ';
    }
    if (n.text) current += n.text;
    if (n.type && BLOCK_NODE_TYPES.has(n.type) && current) {
      // paragraph/heading boundaries become their own line
    }
    n.content?.forEach((child) => {
      const childPrefix = n.type === 'bulletList' || n.type === 'orderedList' ? '- ' : listPrefix;
      walk(child, childPrefix);
    });
    if (n.type && BLOCK_NODE_TYPES.has(n.type)) {
      flush();
    }
  };

  walk(node, null);
  flush();
  return lines.length > 0 ? lines.join('\n') : null;
}

// Real Jira comment-thread mirror: walks a comment's raw ADF for `mention` nodes (attrs.id ==
// the mentioned user's accountId) and `media` nodes (attrs.id -- for issue attachments dragged
// into a comment, this equals the attachment's own `id` from fields.attachment, not a separate
// media-services id) so the mirror can show who was tagged and which files were referenced inline.
function collectAdfReferences(node: JiraAdfNode | null): { mentionIds: string[]; mediaIds: string[] } {
  const mentionIds: string[] = [];
  const mediaIds: string[] = [];
  if (!node) return { mentionIds, mediaIds };

  const walk = (n: JiraAdfNode) => {
    if (n.type === 'mention' && n.attrs?.id) mentionIds.push(String(n.attrs.id));
    if (n.type === 'media' && n.attrs?.id) mediaIds.push(String(n.attrs.id));
    n.content?.forEach(walk);
  };
  walk(node);
  return { mentionIds, mediaIds };
}

function toIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class JiraConnectorService implements IIntegrationConnector {
  readonly key = 'jira';

  // Per-site field name -> id resolution cache (Jira's field metadata is effectively static per
  // instance). Bounded by the number of distinct Jira sites ever connected, not per-request.
  private readonly fieldIdCache = new Map<string, { acceptanceCriteriaFieldId: string | null }>();

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

  // Smart Sprint Import (§2) step: a cheap, wide listing of every issue in the sprint (key, title,
  // issue type, epic, labels, assignee) that powers the picker UI -- selecting specific issues, or
  // computing the distinct epics/labels/assignees for "Import by Epic/Label/Assignee". Deliberately
  // thinner than fetchSprint's already-thin ExternalStoryPayload (no description/points/status),
  // since the picker only ever needs to render a checklist, not full story data.
  async fetchSprintIssuesSummary(
    reference: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalIssueSummaryPayload[]> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };
    const sprintId = await this.resolveSprintId(reference, jiraConfig, jiraCredentials);

    const results: ExternalIssueSummaryPayload[] = [];
    let startAt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = (await fetch(
        `${jiraConfig.siteUrl}/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=${PAGE_SIZE}&fields=summary,issuetype,parent,labels,assignee`,
        { headers },
      )) as unknown as FetchResponse;
      if (!response.ok) {
        throw new Error(`Failed to fetch issues for Jira sprint ${sprintId} (HTTP ${response.status})`);
      }
      const page = (await response.json()) as JiraIssueSummarySearchResponse;

      results.push(
        ...page.issues.map((issue): ExternalIssueSummaryPayload => {
          const isParentEpic = issue.fields.parent?.fields?.issuetype?.name === 'Epic';
          return {
            externalId: issue.key,
            title: issue.fields.summary,
            issueType: issue.fields.issuetype?.name ?? 'Story',
            epicKey: isParentEpic ? (issue.fields.parent?.key ?? null) : null,
            epicName: isParentEpic ? (issue.fields.parent?.fields?.summary ?? issue.fields.parent?.key ?? null) : null,
            labels: issue.fields.labels ?? [],
            assignee: issue.fields.assignee?.displayName ?? null,
          };
        }),
      );

      startAt += page.issues.length;
      if (page.issues.length === 0 || startAt >= page.total || startAt >= MAX_ISSUES) {
        break;
      }
    }

    return results;
  }

  // Best-effort: if the field-metadata lookup fails for any reason, callers just get no
  // acceptance-criteria custom field match, not a hard failure of the whole issue fetch.
  private async resolveAcceptanceCriteriaFieldId(
    jiraConfig: JiraConfig,
    headers: Record<string, string>,
  ): Promise<string | null> {
    const cached = this.fieldIdCache.get(jiraConfig.siteUrl);
    if (cached) {
      return cached.acceptanceCriteriaFieldId;
    }
    try {
      const response = (await fetch(`${jiraConfig.siteUrl}/rest/api/3/field`, { headers })) as unknown as FetchResponse;
      if (!response.ok) {
        this.fieldIdCache.set(jiraConfig.siteUrl, { acceptanceCriteriaFieldId: null });
        return null;
      }
      const fields = (await response.json()) as JiraFieldMeta[];
      const match = fields.find((field) => /acceptance criteria/i.test(field.name));
      const acceptanceCriteriaFieldId = match?.id ?? null;
      this.fieldIdCache.set(jiraConfig.siteUrl, { acceptanceCriteriaFieldId });
      return acceptanceCriteriaFieldId;
    } catch {
      this.fieldIdCache.set(jiraConfig.siteUrl, { acceptanceCriteriaFieldId: null });
      return null;
    }
  }

  // Heuristic fallback when the instance has no dedicated Acceptance Criteria field: Jira teams
  // very commonly put it in the description under a "Acceptance Criteria" heading.
  private extractAcceptanceCriteriaFromDescription(description: string | null): string | null {
    if (!description) return null;
    const match = description.match(/acceptance criteria[:\s]*\n([\s\S]*?)(?:\n\n|$)/i);
    return match ? match[1].trim() || null : null;
  }

  async fetchIssueDetail(
    externalId: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalIssueDetailPayload> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const acceptanceCriteriaFieldId = await this.resolveAcceptanceCriteriaFieldId(jiraConfig, headers);

    const response = (await fetch(
      `${jiraConfig.siteUrl}/rest/api/3/issue/${encodeURIComponent(externalId)}?fields=*all`,
      { headers },
    )) as unknown as FetchResponse;
    if (!response.ok) {
      throw new BadRequestException(`Could not fetch Jira issue ${externalId} (HTTP ${response.status}).`);
    }
    const issue = (await response.json()) as JiraIssueDetailResponse;
    const fields = issue.fields;

    const description = adfToStructuredText(fields.description ?? null);
    const acceptanceCriteriaRaw = acceptanceCriteriaFieldId ? fields[acceptanceCriteriaFieldId] : null;
    const acceptanceCriteria =
      adfToStructuredText((acceptanceCriteriaRaw as string | JiraAdfNode | null) ?? null) ??
      this.extractAcceptanceCriteriaFromDescription(description);

    // Jira comments don't carry their own attachment list -- inline files are `media` ADF nodes
    // referencing the issue's own attachments, so this map has to be built before the comments can
    // resolve their mediaIds to filenames.
    const attachmentFilenameById = new Map<string, string>();
    (fields.attachment ?? []).forEach((attachment) => {
      if (attachment.id) attachmentFilenameById.set(attachment.id, attachment.filename);
    });

    const comments: ExternalIssueCommentPayload[] = (fields.comment?.comments ?? [])
      .map((comment): ExternalIssueCommentPayload => {
        const rawBody = comment.body ?? null;
        const bodyAdf = typeof rawBody === 'string' ? null : rawBody;
        const { mentionIds, mediaIds } = collectAdfReferences(bodyAdf);
        return {
          id: comment.id,
          author: comment.author?.displayName ?? null,
          authorAccountId: comment.author?.accountId ?? null,
          authorAvatarUrl: comment.author?.avatarUrls?.['48x48'] ?? null,
          body: adfToStructuredText(rawBody) ?? '',
          bodyAdf: rawBody,
          mentionedAccountIds: mentionIds,
          attachmentFilenames: mediaIds
            .map((id) => attachmentFilenameById.get(id))
            .filter((filename): filename is string => filename !== undefined),
          createdAt: toIsoDate(comment.created),
        };
      })
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, MAX_COMMENTS);

    const attachments: ExternalIssueAttachmentPayload[] = (fields.attachment ?? []).map(
      (attachment): ExternalIssueAttachmentPayload => ({
        filename: attachment.filename,
        mimeType: attachment.mimeType ?? null,
        sizeBytes: attachment.size ?? null,
        url: attachment.content ?? null,
      }),
    );

    // Known keys already mapped above (plus Agile's default story-points field) are excluded from
    // the passthrough bucket; every other populated customfield_* an org has configured still
    // reaches the AI prompt, just without a friendly name.
    const mappedKeys = new Set([
      'summary', 'description', 'status', 'assignee', 'reporter', 'priority', 'labels', 'components',
      'duedate', 'created', 'updated', 'environment', 'parent', 'comment', 'attachment',
      'customfield_10016', acceptanceCriteriaFieldId,
    ]);
    const additionalCustomFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith('customfield_') && !mappedKeys.has(key) && value !== null && value !== undefined) {
        additionalCustomFields[key] = value;
      }
    }

    const isParentEpic = fields.parent?.fields?.issuetype?.name === 'Epic';
    const links = (fields.issuelinks ?? [])
      .map((link) => ({
        type: link.type?.name ?? 'Relates',
        externalId: link.outwardIssue?.key ?? link.inwardIssue?.key ?? '',
      }))
      .filter((link) => link.externalId.length > 0);

    return {
      externalId: issue.key,
      title: fields.summary,
      description,
      acceptanceCriteria,
      status: fields.status?.name ?? 'Unknown',
      priority: fields.priority?.name ?? null,
      assignee: fields.assignee?.displayName ?? null,
      reporter: fields.reporter?.displayName ?? null,
      labels: fields.labels ?? [],
      components: (fields.components ?? []).map((component) => component.name),
      epic: isParentEpic ? (fields.parent!.fields!.summary ?? fields.parent!.key) : null,
      epicKey: isParentEpic ? fields.parent!.key : null,
      parent: fields.parent ? (fields.parent.fields?.summary ?? fields.parent.key) : null,
      storyPoints: (fields.customfield_10016 as number | null) ?? null,
      dueDate: fields.duedate ? toIsoDate(fields.duedate) : null,
      createdAt: toIsoDate(fields.created),
      updatedAt: toIsoDate(fields.updated),
      environment: adfToStructuredText(fields.environment ?? null),
      comments,
      attachments,
      additionalCustomFields,
      issueType: fields.issuetype?.name ?? 'Story',
      links,
    };
  }

  // BA Review Workflow: posts an ADF comment (built by PostReviewCommentService, incl. any mention
  // node) to the issue's comment thread. Jira Cloud v3 comments require ADF, not wiki markup.
  async postComment(
    externalId: string,
    adfBody: unknown,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<{ commentId: string }> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;

    const response = (await fetch(`${jiraConfig.siteUrl}/rest/api/3/issue/${encodeURIComponent(externalId)}/comment`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(jiraCredentials),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: adfBody }),
    })) as unknown as FetchResponse;

    if (!response.ok) {
      throw new BadRequestException(`Could not post comment to Jira issue ${externalId} (HTTP ${response.status}).`);
    }
    const created = (await response.json()) as JiraCreatedCommentResponse;
    return { commentId: created.id };
  }

  // BA Review Workflow: attaches the generated test-case document (Excel) to the issue. Jira's
  // attachment endpoint requires the anti-CSRF "no-check" header and multipart/form-data -- it
  // does not accept a raw JSON body like every other endpoint this connector calls.
  async uploadAttachment(
    externalId: string,
    file: { filename: string; contentType: string; buffer: Buffer },
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<{ attachmentId: string }> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;

    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: file.contentType }), file.filename);

    const response = (await fetch(
      `${jiraConfig.siteUrl}/rest/api/3/issue/${encodeURIComponent(externalId)}/attachments`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(jiraCredentials),
          Accept: 'application/json',
          'X-Atlassian-Token': 'no-check',
        },
        body: form,
      },
    )) as unknown as FetchResponse;

    if (!response.ok) {
      throw new BadRequestException(
        `Could not upload attachment to Jira issue ${externalId} (HTTP ${response.status}).`,
      );
    }
    const created = (await response.json()) as JiraCreatedAttachmentResponse[];
    return { attachmentId: created[0].id };
  }

  // BA Review Workflow: resolves the assigned BA's email/name to a Jira accountId so the comment
  // can use a real ADF mention node instead of plain "@name" text. Best-effort -- callers post the
  // comment without a mention (never fail the whole post) when this returns null.
  async resolveUserAccountId(
    query: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<{ accountId: string; displayName: string } | null> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const response = (await fetch(
      `${jiraConfig.siteUrl}/rest/api/3/user/search?query=${encodeURIComponent(query)}`,
      { headers },
    )) as unknown as FetchResponse;
    if (!response.ok) {
      return null;
    }
    const results = (await response.json()) as JiraUserSearchResult[];
    const match = results[0];
    return match ? { accountId: match.accountId, displayName: match.displayName } : null;
  }

  // Submit for Review modal's BA mention/CC pickers -- same endpoint as resolveUserAccountId
  // above, but returns every match (capped) instead of only the best one, since a human is
  // choosing here rather than the system auto-resolving a single @mention.
  async searchUsers(
    query: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalUserMatch[]> {
    const jiraCredentials = credentials as JiraCredentials;
    const jiraConfig = config as unknown as JiraConfig;
    const headers = { Authorization: this.authHeader(jiraCredentials), Accept: 'application/json' };

    const response = (await fetch(
      `${jiraConfig.siteUrl}/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=10`,
      { headers },
    )) as unknown as FetchResponse;
    if (!response.ok) {
      return [];
    }
    const results = (await response.json()) as JiraUserSearchResult[];
    return results.map((r) => ({
      accountId: r.accountId,
      displayName: r.displayName,
      avatarUrl: r.avatarUrls?.['48x48'] ?? null,
    }));
  }
}
