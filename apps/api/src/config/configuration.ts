// Namespaced configuration factory consumed via ConfigService.get('auth.accessTtl'), etc.
// Keeps env var names (SCREAMING_SNAKE_CASE) out of the rest of the codebase.
export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3001', 10),
    url: process.env.APP_URL,
    webUrl: process.env.WEB_URL,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshTtl: process.env.JWT_REFRESH_TTL,
  },
  credentialVault: {
    encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY,
  },
  internal: {
    cronSecret: process.env.INTERNAL_CRON_SECRET,
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'anthropic',
  },
  observability: {
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    logLevel: process.env.LOG_LEVEL,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
