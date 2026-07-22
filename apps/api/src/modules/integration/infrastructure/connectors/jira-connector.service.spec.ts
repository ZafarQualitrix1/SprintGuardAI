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
  });
});
