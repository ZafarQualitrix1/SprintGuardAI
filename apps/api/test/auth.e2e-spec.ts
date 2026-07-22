import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TestAppContext } from './utils/create-test-app';
import { buildMembershipRow, buildUserRow } from './utils/mock-data';

describe('Auth (e2e)', () => {
  let ctx: TestAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    (ctx.prisma.$transaction as unknown as jest.Mock).mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(ctx.prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates an organization + owner and returns a session', async () => {
      ctx.prisma.user.findUnique.mockResolvedValue(null);
      ctx.prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        key: 'OWNER',
        name: 'Owner',
        isSystem: true,
        createdAt: new Date(),
      } as never);
      ctx.prisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);
      ctx.prisma.user.create.mockResolvedValue(buildUserRow({ email: 'jane@acme.com' }) as never);
      ctx.prisma.membership.create.mockResolvedValue({} as never);
      ctx.prisma.membership.findFirstOrThrow.mockResolvedValue(
        buildMembershipRow({ permissions: ['sprint:read', 'sprint:write'] }) as never,
      );
      ctx.prisma.refreshToken.create.mockResolvedValue({
        id: 'refresh-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        revokedAt: null,
        replacedByTokenId: null,
        createdAt: new Date(),
      } as never);

      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        organizationName: 'Acme Corp',
        fullName: 'Jane Doe',
        email: 'jane@acme.com',
        password: 'super-secret-password',
      });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user).toMatchObject({
        email: 'jane@acme.com',
        organizationName: 'Acme Corp',
        roleKey: 'OWNER',
      });
      expect(response.headers['set-cookie']?.[0]).toContain('refresh_token=');
    });

    it('rejects a malformed payload with 400 before touching the database', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        organizationName: 'A',
        email: 'not-an-email',
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 for an email with no matching user', async () => {
      ctx.prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@acme.com', password: 'whatever-password' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without a bearer token', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });
  });
});
