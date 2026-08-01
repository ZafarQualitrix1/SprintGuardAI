import { ExternalIssueDetailPayload } from '../../../integration/application/ports/integration-connector.port';

// The AI prompt template only does flat {{var}} substitution (no loops/conditionals -- see
// prompt-template.util.ts), so list-shaped Jira data (comments, labels, components, custom
// fields) is flattened into one pre-formatted block here rather than in the template itself.
function section(title: string, body: string | null | undefined): string {
  if (!body || !body.trim()) return '';
  return `## ${title}\n${body.trim()}\n`;
}

function list(title: string, items: string[]): string {
  if (items.length === 0) return '';
  return `## ${title}\n${items.map((item) => `- ${item}`).join('\n')}\n`;
}

export function buildStoryContext(issue: ExternalIssueDetailPayload): string {
  const parts: string[] = [];

  parts.push(`## Story\n${issue.externalId}: ${issue.title}`);
  parts.push(section('Description', issue.description));
  parts.push(section('Acceptance Criteria (as found in Jira)', issue.acceptanceCriteria));

  parts.push(
    [
      `## Metadata`,
      `Status: ${issue.status}`,
      `Priority: ${issue.priority ?? 'Not set'}`,
      `Assignee: ${issue.assignee ?? 'Unassigned'}`,
      `Reporter: ${issue.reporter ?? 'Unknown'}`,
      `Story Points: ${issue.storyPoints ?? 'Not estimated'}`,
      `Epic: ${issue.epic ?? 'None'}`,
      `Parent: ${issue.parent ?? 'None'}`,
      `Due Date: ${issue.dueDate ? issue.dueDate.toISOString().slice(0, 10) : 'Not set'}`,
      `Created: ${issue.createdAt ? issue.createdAt.toISOString() : 'Unknown'}`,
      `Updated: ${issue.updatedAt ? issue.updatedAt.toISOString() : 'Unknown'}`,
    ].join('\n'),
  );

  parts.push(list('Labels', issue.labels));
  parts.push(list('Components', issue.components));
  parts.push(section('Environment', issue.environment));

  if (issue.comments.length > 0) {
    const commentsText = issue.comments
      .map((comment) => `- [${comment.author ?? 'Unknown'}${comment.createdAt ? ` @ ${comment.createdAt.toISOString()}` : ''}] ${comment.body}`)
      .join('\n');
    parts.push(`## Recent Comments\n${commentsText}\n`);
  }

  if (issue.attachments.length > 0) {
    const attachmentsText = issue.attachments
      .map((attachment) => `- ${attachment.filename} (${attachment.mimeType ?? 'unknown type'}${attachment.sizeBytes ? `, ${attachment.sizeBytes} bytes` : ''})`)
      .join('\n');
    parts.push(`## Attachments (metadata only, contents not provided)\n${attachmentsText}\n`);
  }

  const customFieldEntries = Object.entries(issue.additionalCustomFields);
  if (customFieldEntries.length > 0) {
    const customFieldsText = customFieldEntries
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join('\n');
    parts.push(`## Additional Custom Fields\n${customFieldsText}\n`);
  }

  return parts.filter(Boolean).join('\n');
}
