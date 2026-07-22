import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, TestAppContext } from './utils/create-test-app';
import { buildMembershipRow } from './utils/mock-data';

describe('Projects (e2e)', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let jwtService: JwtService;

  const signToken = (userId: string, orgId: string) => jwtService.sign({ sub: userId, orgId });

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/projects returns the caller\'s organization projects', async () => {
    ctx.prisma.membership.findFirst.mockResolvedValue(
      buildMembershipRow({ organizationId: 'org-1', permissions: ['sprint:read'] }) as never,
    );
    ctx.prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        organizationId: 'org-1',
        key: 'PROJ',
        name: 'Payments Platform',
        description: null,
        workspaceId: null,
        portfolioId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ] as never);

    const response = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${signToken('user-1', 'org-1')}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'project-1', key: 'PROJ', name: 'Payments Platform', description: null }]);
  });

  it('POST /api/v1/projects creates a project for a caller with sprint:write', async () => {
    ctx.prisma.membership.findFirst.mockResolvedValue(
      buildMembershipRow({ organizationId: 'org-1', permissions: ['sprint:write'] }) as never,
    );
    ctx.prisma.project.findFirst.mockResolvedValue(null);
    ctx.prisma.project.create.mockResolvedValue({
      id: 'project-2',
      organizationId: 'org-1',
      key: 'NEW',
      name: 'New Project',
      description: null,
      workspaceId: null,
      portfolioId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as never);

    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${signToken('user-1', 'org-1')}`)
      .send({ key: 'new', name: 'New Project' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ key: 'NEW', name: 'New Project' });
  });

  it('POST /api/v1/projects returns 403 for a caller without sprint:write', async () => {
    ctx.prisma.membership.findFirst.mockResolvedValue(
      buildMembershipRow({ organizationId: 'org-1', permissions: ['sprint:read'] }) as never,
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${signToken('user-1', 'org-1')}`)
      .send({ key: 'new', name: 'New Project' });

    expect(response.status).toBe(403);
    expect(ctx.prisma.project.create).not.toHaveBeenCalled();
  });

  it('returns 401 for a token whose membership no longer matches the claimed org', async () => {
    ctx.prisma.membership.findFirst.mockResolvedValue(
      buildMembershipRow({ organizationId: 'org-OTHER', permissions: ['sprint:read'] }) as never,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${signToken('user-1', 'org-1')}`);

    expect(response.status).toBe(401);
  });
});
