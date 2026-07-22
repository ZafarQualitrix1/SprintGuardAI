// Populates the environment before AppModule/ConfigModule ever load (Jest `setupFiles` run before
// the test framework and any test file imports). No real Postgres/Redis is needed -- PrismaService
// is replaced with a deep mock in test/utils/create-test-app.ts, and nothing in these e2e tests
// exercises Redis/Bull directly.
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.APP_URL = 'http://localhost:3001';
process.env.WEB_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret-not-for-production-use';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-not-for-production-use';
process.env.JWT_REFRESH_TTL = '30d';
process.env.CREDENTIAL_ENCRYPTION_KEY = 'e2e-test-credential-vault-key-not-for-production';
process.env.AI_DEFAULT_PROVIDER = 'anthropic';
process.env.LOG_LEVEL = 'error';
