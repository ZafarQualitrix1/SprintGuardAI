import { z } from 'zod';

// Fail-fast environment validation (Solution Architecture: Environment Configurations).
// Wired into ConfigModule.forRoot({ validate }) in app.module.ts -- the app refuses to boot
// with a missing/malformed required variable rather than failing later at first use.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().default('30d'),

  CREDENTIAL_ENCRYPTION_KEY: z.string().min(16),

  // Powers Organization Settings' logo upload (Supabase Storage). Optional so unrelated boots
  // don't hard-fail if unset -- the upload endpoint itself rejects clearly if hit while unconfigured.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),

  // Guards the internal health-check sweep endpoint (InternalSecretGuard) -- optional so unrelated
  // boots don't hard-fail if unset; the guard itself rejects clearly if the endpoint is hit while
  // this is unconfigured.
  INTERNAL_CRON_SECRET: z.string().min(16).optional(),

  // Automation Execution Module (§9/§10) -- optional so unrelated boots don't hard-fail if unset;
  // TriggerAutomationExecutionCommand rejects clearly if a run is attempted while unconfigured.
  GITHUB_ACTIONS_TOKEN: z.string().optional(),
  GITHUB_ACTIONS_REPO: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_DEFAULT_PROVIDER: z.enum(['anthropic', 'openai', 'groq', 'openrouter', 'google']).default('groq'),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}
