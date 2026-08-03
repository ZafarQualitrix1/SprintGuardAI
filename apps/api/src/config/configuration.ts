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
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'org-assets',
  },
  internal: {
    cronSecret: process.env.INTERNAL_CRON_SECRET,
  },
  // Automation Execution Module (§9/§10): dispatches .github/workflows/automation-execution.yml
  // in this same repo via workflow_dispatch. Requires a PAT (or GitHub App token) with
  // `actions:write` on GITHUB_ACTIONS_REPO -- optional so unrelated boots don't hard-fail if
  // unset; TriggerAutomationExecutionCommand surfaces a clear error if a run is attempted without it.
  githubActions: {
    token: process.env.GITHUB_ACTIONS_TOKEN,
    repo: process.env.GITHUB_ACTIONS_REPO,
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'groq',
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
