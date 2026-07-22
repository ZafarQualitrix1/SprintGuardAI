import { parseJiraSprintReference } from './jira-reference.util';

describe('parseJiraSprintReference', () => {
  it('returns a bare numeric id unchanged', () => {
    expect(parseJiraSprintReference('123')).toBe('123');
    expect(parseJiraSprintReference('  456  ')).toBe('456');
  });

  it('extracts sprintId from a board URL query param', () => {
    const url = 'https://acme.atlassian.net/jira/software/projects/PROJ/boards/1?sprintId=789';
    expect(parseJiraSprintReference(url)).toBe('789');
  });

  it('extracts sprintId from a REST API style path', () => {
    expect(parseJiraSprintReference('https://acme.atlassian.net/rest/agile/1.0/sprint/321')).toBe('321');
  });

  it('throws a descriptive error when no sprint id can be found', () => {
    expect(() => parseJiraSprintReference('https://acme.atlassian.net/jira/software/projects/PROJ')).toThrow(
      /Could not extract a sprint id/,
    );
    expect(() => parseJiraSprintReference('not-a-url-or-id')).toThrow(/Could not extract a sprint id/);
  });
});
