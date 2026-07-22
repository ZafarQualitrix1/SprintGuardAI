import { mapExternalStatus } from './import-sprint-from-jira.command';

describe('mapExternalStatus', () => {
  it.each([
    ['Done', 'DONE'],
    ['Closed', 'DONE'],
    ['Resolved', 'DONE'],
    ['Blocked', 'BLOCKED'],
    ['In Review', 'IN_REVIEW'],
    ['QA', 'IN_REVIEW'],
    ['In Progress', 'IN_PROGRESS'],
    ['Doing', 'IN_PROGRESS'],
    ['To Do', 'BACKLOG'],
    ['Backlog', 'BACKLOG'],
    ['Some Custom Workflow Step', 'BACKLOG'],
  ])('maps Jira status "%s" to %s', (jiraStatus, expected) => {
    expect(mapExternalStatus(jiraStatus)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(mapExternalStatus('DONE')).toBe('DONE');
    expect(mapExternalStatus('in progress')).toBe('IN_PROGRESS');
  });
});
