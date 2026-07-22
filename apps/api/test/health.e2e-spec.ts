import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health/live is public and version-neutral (no /v1 in the path)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('rejects an unversioned, non-health route with 404', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me');

    expect(response.status).toBe(404);
  });
});
