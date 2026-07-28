import { BadRequestException } from '@nestjs/common';

// Accepts either a bare sprint id ("123") or a full Jira Cloud board/sprint URL
// (e.g. "https://acme.atlassian.net/jira/software/projects/PROJ/boards/1?sprintId=123") and
// extracts the numeric Agile API sprint id either way, since users will paste whatever their
// browser address bar shows.
export function parseJiraSprintReference(reference: string): string {
  const trimmed = reference.trim();

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const sprintIdParam = url.searchParams.get('sprintId');
    if (sprintIdParam && /^\d+$/.test(sprintIdParam)) {
      return sprintIdParam;
    }
  } catch {
    // Not a URL -- fall through to the path-segment heuristic below.
  }

  const match = trimmed.match(/sprint\/(\d+)/i);
  if (match?.[1]) {
    return match[1];
  }

  throw new BadRequestException(
    `Could not extract a sprint id from "${reference}". Paste either the numeric sprint id or the full board URL containing ?sprintId=...`,
  );
}

// Team-managed Jira boards never put ?sprintId= in the URL (only company-managed boards'
// backlog view does), so a plain board URL is the only reference those users can copy. Extracts
// the board id from it so the caller can look up the board's active/future sprint instead.
export function extractJiraBoardId(reference: string): string | null {
  const match = reference.trim().match(/\/boards\/(\d+)/i);
  return match?.[1] ?? null;
}
