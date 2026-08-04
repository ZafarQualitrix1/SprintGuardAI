import { UnauthorizedException } from '@nestjs/common';
import { JiraConnectorService } from './jira-connector.service';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('JiraConnectorService', () => {
  let connector: JiraConnectorService;
  let fetchMock: jest.Mock;

  const credentials = { email: 'jane@acme.com', apiToken: 'token-123' };
  const config = { siteUrl: 'https://acme.atlassian.net' };

  beforeEach(() => {
    connector = new JiraConnectorService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('verifyCredentials', () => {
    it('resolves when Jira returns 200', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ accountId: 'abc' }));

      await expect(connector.verifyCredentials(credentials, config)).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://acme.atlassian.net/rest/api/3/myself',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from('jane@acme.com:token-123').toString('base64')}`,
          }),
        }),
      );
    });

    it('throws UnauthorizedException when Jira rejects the credentials', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 401));

      await expect(connector.verifyCredentials(credentials, config)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('fetchSprint', () => {
    it('maps sprint metadata and paginated issues into the canonical payload', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            id: 42,
            name: 'Sprint 7',
            goal: 'Ship the thing',
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-01-14T00:00:00.000Z',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            startAt: 0,
            maxResults: 100,
            total: 2,
            issues: [
              {
                id: '1',
                key: 'PROJ-1',
                fields: {
                  summary: 'Implement login',
                  description: {
                    type: 'doc',
                    content: [
                      { type: 'paragraph', content: [{ type: 'text', text: 'As a user I want to log in' }] },
                    ],
                  },
                  status: { name: 'In Progress' },
                  assignee: { displayName: 'Jane Doe' },
                  priority: { name: 'High' },
                  customfield_10016: 5,
                },
              },
              {
                id: '2',
                key: 'PROJ-2',
                fields: {
                  summary: 'Fix logout bug',
                  description: 'Plain string description',
                  status: { name: 'Done' },
                  assignee: null,
                  priority: null,
                  customfield_10016: null,
                },
              },
            ],
          }),
        );

      const result = await connector.fetchSprint('42', credentials, config);

      expect(result).toEqual({
        externalId: '42',
        name: 'Sprint 7',
        goal: 'Ship the thing',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-01-14T00:00:00.000Z'),
        stories: [
          {
            externalId: 'PROJ-1',
            title: 'Implement login',
            description: 'As a user I want to log in',
            storyPoints: 5,
            status: 'In Progress',
            priority: 'High',
            assignee: 'Jane Doe',
          },
          {
            externalId: 'PROJ-2',
            title: 'Fix logout bug',
            description: 'Plain string description',
            storyPoints: null,
            status: 'Done',
            priority: null,
            assignee: null,
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('parses a full board URL reference before calling the Agile API', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ id: 99, name: 'Sprint X' }))
        .mockResolvedValueOnce(jsonResponse({ startAt: 0, maxResults: 100, total: 0, issues: [] }));

      await connector.fetchSprint(
        'https://acme.atlassian.net/jira/software/projects/PROJ/boards/1?sprintId=99',
        credentials,
        config,
      );

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://acme.atlassian.net/rest/agile/1.0/sprint/99',
        expect.any(Object),
      );
    });

    it('throws when the sprint metadata request fails', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 404));

      await expect(connector.fetchSprint('42', credentials, config)).rejects.toThrow(
        /Failed to fetch Jira sprint 42/,
      );
    });

    it('resolves a board reference with no sprintId via fetchActiveSprints', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            values: [
              { id: 10, name: 'Sprint 10', state: 'future' },
              { id: 9, name: 'Sprint 9', state: 'active' },
            ],
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ id: 9, name: 'Sprint 9' }))
        .mockResolvedValueOnce(jsonResponse({ startAt: 0, maxResults: 100, total: 0, issues: [] }));

      await connector.fetchSprint(
        'https://acme.atlassian.net/jira/software/projects/PROJ/boards/7',
        credentials,
        config,
      );

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://acme.atlassian.net/rest/agile/1.0/board/7/sprint?state=active,future',
        expect.any(Object),
      );
      // Active sprint preferred over future when both are present.
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://acme.atlassian.net/rest/agile/1.0/sprint/9',
        expect.any(Object),
      );
    });
  });

  describe('fetchProjects', () => {
    it('paginates until isLast and maps to the canonical project payload', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            startAt: 0,
            maxResults: 1,
            total: 2,
            isLast: false,
            values: [
              { key: 'PROJ', name: 'Project One', avatarUrls: { '48x48': 'https://avatar/1' }, lead: { displayName: 'Jane' } },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            startAt: 1,
            maxResults: 1,
            total: 2,
            isLast: true,
            values: [{ key: 'OPS', name: 'Ops', avatarUrls: {}, lead: undefined }],
          }),
        );

      const result = await connector.fetchProjects(credentials, config);

      expect(result).toEqual([
        { externalKey: 'PROJ', name: 'Project One', avatarUrl: 'https://avatar/1', lead: 'Jane' },
        { externalKey: 'OPS', name: 'Ops', avatarUrl: null, lead: null },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException when the project search fails', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 403));

      await expect(connector.fetchProjects(credentials, config)).rejects.toThrow(/Could not list Jira projects/);
    });
  });

  describe('fetchBoards', () => {
    it('maps boards for a project', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ values: [{ id: 5, name: 'Sprint Board', type: 'scrum' }] }),
      );

      const result = await connector.fetchBoards('PROJ', credentials, config);

      expect(result).toEqual([{ id: '5', name: 'Sprint Board', type: 'scrum' }]);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://acme.atlassian.net/rest/agile/1.0/board?projectKeyOrId=PROJ',
        expect.any(Object),
      );
    });
  });

  describe('fetchIssueDetail', () => {
    it('maps comment author accountId/avatar, mentions, and inline-media attachment filenames', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(
          jsonResponse({
            key: 'PROJ-9',
            fields: {
              summary: 'Implement login',
              status: { name: 'In Progress' },
              comment: {
                comments: [
                  {
                    id: 'c1',
                    author: {
                      accountId: 'acc-1',
                      displayName: 'Jane Doe',
                      avatarUrls: { '48x48': 'https://avatar/jane' },
                    },
                    created: '2026-01-02T00:00:00.000Z',
                    body: {
                      type: 'doc',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            { type: 'text', text: 'Approved, cc ' },
                            { type: 'mention', attrs: { id: 'acc-2', text: '@John' } },
                            { type: 'text', text: ' see attached' },
                          ],
                        },
                        {
                          type: 'mediaSingle',
                          content: [{ type: 'media', attrs: { id: 'att-1', type: 'file' } }],
                        },
                      ],
                    },
                  },
                ],
              },
              attachment: [{ id: 'att-1', filename: 'evidence.png', size: 10, mimeType: 'image/png' }],
            },
          }),
        );

      const result = await connector.fetchIssueDetail('PROJ-9', credentials, config);

      expect(result.comments).toEqual([
        expect.objectContaining({
          id: 'c1',
          author: 'Jane Doe',
          authorAccountId: 'acc-1',
          authorAvatarUrl: 'https://avatar/jane',
          mentionedAccountIds: ['acc-2'],
          attachmentFilenames: ['evidence.png'],
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      ]);
    });
  });

  describe('fetchActiveSprints', () => {
    it('maps active/future sprints for a board', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          values: [{ id: 9, name: 'Sprint 9', state: 'active', startDate: '2026-01-01T00:00:00.000Z' }],
        }),
      );

      const result = await connector.fetchActiveSprints('7', credentials, config);

      expect(result).toEqual([
        {
          externalId: '9',
          name: 'Sprint 9',
          state: 'active',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: null,
        },
      ]);
    });
  });
});
