// Canonical, connector-agnostic shape the Transformation Layer (Solution Architecture §18) maps
// every external system into. The `sprint` module's ImportSprintFromIntegration command only ever
// deals with this shape -- it has no knowledge of Jira/Linear-specific fields.
export interface ExternalStoryPayload {
  externalId: string;
  title: string;
  description: string | null;
  storyPoints: number | null;
  status: string;
  priority: string | null;
  assignee: string | null;
}

export interface ExternalSprintPayload {
  externalId: string;
  name: string;
  goal: string | null;
  startDate: Date | null;
  endDate: Date | null;
  stories: ExternalStoryPayload[];
}

export interface ConnectorCredentials {
  [key: string]: string;
}

// Wizard-support payloads (step 2/3/4 of the guided import flow) -- deliberately thinner than
// ExternalSprintPayload/ExternalStoryPayload since these only exist to populate pickers, never to
// persist domain data directly.
export interface ExternalProjectPayload {
  externalKey: string;
  name: string;
  avatarUrl: string | null;
  lead: string | null;
}

export interface ExternalBoardPayload {
  id: string;
  name: string;
  type: string;
}

export interface ExternalActiveSprintPayload {
  externalId: string;
  name: string;
  state: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Smart Sprint Import (§2) picker payload -- see fetchSprintIssuesSummary.
export interface ExternalIssueSummaryPayload {
  externalId: string;
  title: string;
  issueType: string;
  epicKey: string | null;
  epicName: string | null;
  labels: string[];
  assignee: string | null;
}

export interface ExternalIssueLinkPayload {
  type: string;
  externalId: string;
}

// Full single-issue detail for deep AI analysis (Requirement Intelligence "Analyze story"), as
// opposed to ExternalStoryPayload's thin sprint-import subset. Attachments are metadata only --
// no binary content is fetched or sent to the AI. additionalCustomFields carries through any
// populated customfield_* the connector didn't map to a named field above, so org-specific Jira
// setups aren't silently dropped.
export interface ExternalIssueCommentPayload {
  id: string;
  author: string | null;
  body: string;
  createdAt: Date | null;
}

export interface ExternalIssueAttachmentPayload {
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string | null;
}

export interface ExternalIssueDetailPayload {
  externalId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  status: string;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  components: string[];
  epic: string | null;
  epicKey: string | null;
  parent: string | null;
  storyPoints: number | null;
  dueDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  environment: string | null;
  comments: ExternalIssueCommentPayload[];
  attachments: ExternalIssueAttachmentPayload[];
  additionalCustomFields: Record<string, unknown>;
  // Smart Sprint Import (§2): issue-type classification (Story/Task/Bug/Sub-task/Epic) and Jira
  // issue links (mapped to Dependency rows when both ends of a link were imported in the same
  // batch -- see ImportSprintFromJiraHandler).
  issueType: string;
  links: ExternalIssueLinkPayload[];
}

// Implemented once per external system (Jira first -- Solution Architecture §18's reference
// implementation -- Linear next, behind this same port). A "Connector Registry" in the
// architecture sense is, for this MVP scope, the simple key->instance map built in
// integration.module.ts rather than a separate persisted table.
export interface IIntegrationConnector {
  readonly key: string;
  /** Throws if the credentials/config cannot authenticate against the external system. */
  verifyCredentials(credentials: ConnectorCredentials, config: Record<string, unknown>): Promise<void>;
  /** `reference` is whatever a user pastes -- a full URL or a bare external sprint id. */
  fetchSprint(
    reference: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalSprintPayload>;
  /** Import wizard step 2 / connection card "Open Projects" / "Sync Now". */
  fetchProjects(credentials: ConnectorCredentials, config: Record<string, unknown>): Promise<ExternalProjectPayload[]>;
  /** Import wizard step 3. */
  fetchBoards(
    projectKey: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalBoardPayload[]>;
  /** Import wizard step 4. */
  fetchActiveSprints(
    boardId: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalActiveSprintPayload[]>;
  /** Full single-issue detail for deep AI analysis -- Requirement Intelligence "Analyze story". */
  fetchIssueDetail(
    externalId: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalIssueDetailPayload>;
  /** Smart Sprint Import (§2) picker -- cheap listing of every issue in a sprint. */
  fetchSprintIssuesSummary(
    reference: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalIssueSummaryPayload[]>;
  /** Posts an ADF-formatted comment (BA Review Workflow) -- caller builds the ADF doc, incl. any mention nodes. */
  postComment(
    externalId: string,
    adfBody: unknown,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<{ commentId: string }>;
  /** Uploads a binary attachment (BA Review Workflow's generated test-case document) to an issue. */
  uploadAttachment(
    externalId: string,
    file: { filename: string; contentType: string; buffer: Buffer },
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<{ attachmentId: string }>;
  /** Resolves a user's Jira accountId (needed for ADF @mentions) by email or display name; null if no match. */
  resolveUserAccountId(
    query: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<{ accountId: string; displayName: string } | null>;
  /**
   * Multi-result user search backing the Submit for Review modal's BA mention/CC pickers -- unlike
   * resolveUserAccountId (single best match, for automatic @mention resolution), this returns every
   * match so a human can choose. Capped by the connector implementation.
   */
  searchUsers(
    query: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalUserMatch[]>;
}

export interface ExternalUserMatch {
  accountId: string;
  displayName: string;
  avatarUrl: string | null;
}

// Multi-provider injection token: integration.module.ts binds this to an array of every
// registered connector; FetchExternalSprintHandler builds a key->instance lookup from it. Adding
// a new connector (Linear, etc.) never requires touching the handler.
export const INTEGRATION_CONNECTORS = Symbol('IntegrationConnectors');
