import { Injectable } from '@nestjs/common';
import { AutomationFile } from '../../domain/entities/automation-generation.entity';

// Version stamped onto every AutomationGeneration row (Automation Repository, §12 "Framework
// Version"). Bump this whenever the scaffold files below change shape, so old generations remain
// traceable to the framework they were actually built against.
export const PLAYWRIGHT_FRAMEWORK_VERSION = '1.0.0';
export const AUTOMATION_GENERATOR_VERSION = '1.0.0';

function envFile(): string {
  return [
    'BASE_URL=https://staging.example.com',
    'API_BASE_URL=https://staging.example.com/api/v1',
    'AUTH_TOKEN=',
    'AUTH_EMAIL=',
    'AUTH_PASSWORD=',
  ].join('\n');
}

function envConfigFile(): string {
  return [
    "import 'dotenv/config';",
    '',
    '// Central place every helper reads config from -- never read process.env directly elsewhere.',
    'export const env = {',
    "  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',",
    "  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1',",
    "  authToken: process.env.AUTH_TOKEN ?? '',",
    "  authEmail: process.env.AUTH_EMAIL ?? '',",
    "  authPassword: process.env.AUTH_PASSWORD ?? '',",
    '};',
    '',
  ].join('\n');
}

function loggerFile(): string {
  return [
    '// Minimal structured logger -- swap for pino/winston in a real CI pipeline without touching',
    '// call sites.',
    'export const logger = {',
    "  info: (message: string, meta?: Record<string, unknown>) => console.log(`[INFO] ${message}`, meta ?? ''),",
    "  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[WARN] ${message}`, meta ?? ''),",
    "  error: (message: string, meta?: Record<string, unknown>) => console.error(`[ERROR] ${message}`, meta ?? ''),",
    '};',
    '',
  ].join('\n');
}

function testDataManagerFile(): string {
  return [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    '',
    '// Loads a fixture from test-data/<name>.json. Keeps generated spec files free of inline',
    '// hardcoded payloads so the same automation can be re-pointed at different environments.',
    'export function loadTestData<T = Record<string, unknown>>(name: string): T {',
    "  const filePath = path.join(__dirname, '..', '..', 'test-data', `${name}.json`);",
    '  if (!fs.existsSync(filePath)) {',
    '    throw new Error(`Test data file not found: ${filePath}`);',
    '  }',
    "  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;",
    '}',
    '',
  ].join('\n');
}

function apiFrameworkFiles(): AutomationFile[] {
  return [
    {
      path: 'playwright.config.ts',
      content: [
        "import { defineConfig } from '@playwright/test';",
        "import { env } from './src/config/env';",
        '',
        '// API-only project: no browser needed, so no `use.browserName`. Retries + parallel workers',
        '// are CI-ready out of the box (§10 Playwright Integration).',
        'export default defineConfig({',
        "  testDir: './tests/api',",
        '  fullyParallel: true,',
        '  retries: process.env.CI ? 2 : 0,',
        '  workers: process.env.CI ? 4 : undefined,',
        "  reporter: [['html', { outputFolder: 'playwright-report' }], ['json', { outputFile: 'test-results/results.json' }], ['list']],",
        '  use: {',
        '    baseURL: env.apiBaseUrl,',
        "    extraHTTPHeaders: { Accept: 'application/json' },",
        "    trace: 'retain-on-failure',",
        '  },',
        '});',
        '',
      ].join('\n'),
    },
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'sprintguard-api-automation',
          private: true,
          version: '1.0.0',
          scripts: {
            test: 'playwright test',
            'test:report': 'playwright show-report',
          },
          devDependencies: {
            '@playwright/test': '^1.47.0',
            dotenv: '^16.4.5',
            typescript: '^5.5.0',
          },
        },
        null,
        2,
      ),
    },
    { path: '.env.example', content: envFile() },
    { path: 'src/config/env.ts', content: envConfigFile() },
    { path: 'src/utils/logger.ts', content: loggerFile() },
    {
      path: 'src/utils/auth-helper.ts',
      content: [
        "import { env } from '../config/env';",
        '',
        '// Centralizes how every request gets authenticated -- generated specs never build headers',
        '// by hand, so a future auth-scheme change is a one-file edit.',
        'export function getAuthHeaders(): Record<string, string> {',
        '  if (!env.authToken) return {};',
        "  return { Authorization: `Bearer ${env.authToken}` };",
        '}',
        '',
      ].join('\n'),
    },
    {
      path: 'src/utils/response-validator.ts',
      content: [
        "import { APIResponse, expect } from '@playwright/test';",
        '',
        '// Common assertions every generated spec should use instead of ad-hoc `expect(res.status())`',
        '// calls, so failure messages stay consistent and easy to grep in CI logs.',
        'export function expectStatus(response: APIResponse, expected: number) {',
        '  expect(response.status(), `Expected HTTP ${expected}, got ${response.status()}: ${response.url()}`).toBe(expected);',
        '}',
        '',
        'export async function expectBodyContains(response: APIResponse, expectedFields: Record<string, unknown>) {',
        '  const body = await response.json();',
        '  for (const [key, value] of Object.entries(expectedFields)) {',
        '    expect(body[key], `Expected response.${key} to equal ${JSON.stringify(value)}`).toEqual(value);',
        '  }',
        '  return body;',
        '}',
        '',
      ].join('\n'),
    },
    { path: 'src/utils/test-data-manager.ts', content: testDataManagerFile() },
    {
      path: 'src/fixtures/api-fixtures.ts',
      content: [
        "import { test as base, request, APIRequestContext } from '@playwright/test';",
        "import { env } from '../config/env';",
        "import { getAuthHeaders } from '../utils/auth-helper';",
        "import { logger } from '../utils/logger';",
        '',
        '// Thin wrapper over Playwright\'s APIRequestContext adding retry-on-5xx + structured',
        '// logging -- every generated spec imports `apiClient` from here instead of constructing',
        '// its own request context (Request Builder + Retry Logic, §6).',
        'class ApiClient {',
        '  constructor(private readonly context: APIRequestContext) {}',
        '',
        '  private async withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {',
        '    let lastError: unknown;',
        '    for (let attempt = 1; attempt <= attempts; attempt++) {',
        '      try {',
        '        logger.info(`${label} (attempt ${attempt}/${attempts})`);',
        '        return await fn();',
        '      } catch (error) {',
        '        lastError = error;',
        '        logger.warn(`${label} failed on attempt ${attempt}`, { error: String(error) });',
        '      }',
        '    }',
        '    throw lastError;',
        '  }',
        '',
        "  get(path: string, options: { params?: Record<string, string> } = {}) {",
        "    return this.withRetry(`GET ${path}`, () => this.context.get(path, { headers: getAuthHeaders(), params: options.params }));",
        '  }',
        "  post(path: string, options: { data?: unknown } = {}) {",
        "    return this.withRetry(`POST ${path}`, () => this.context.post(path, { headers: getAuthHeaders(), data: options.data }));",
        '  }',
        "  put(path: string, options: { data?: unknown } = {}) {",
        "    return this.withRetry(`PUT ${path}`, () => this.context.put(path, { headers: getAuthHeaders(), data: options.data }));",
        '  }',
        "  patch(path: string, options: { data?: unknown } = {}) {",
        "    return this.withRetry(`PATCH ${path}`, () => this.context.patch(path, { headers: getAuthHeaders(), data: options.data }));",
        '  }',
        "  delete(path: string) {",
        "    return this.withRetry(`DELETE ${path}`, () => this.context.delete(path, { headers: getAuthHeaders() }));",
        '  }',
        '}',
        '',
        'export const test = base.extend<{ apiClient: ApiClient }>({',
        '  apiClient: async ({}, use) => {',
        '    const context = await request.newContext({ baseURL: env.apiBaseUrl });',
        '    await use(new ApiClient(context));',
        '    await context.dispose();',
        '  },',
        '});',
        '',
        "export { expect } from '@playwright/test';",
        '',
      ].join('\n'),
    },
    {
      path: 'tests/api/README.md',
      content:
        '# Generated API automation\n\nEach test case gets its own spec file here, generated by SprintGuard AI\'s ' +
        'Automation module. Regenerating a test case creates a new version in the Automation Repository ' +
        'without touching previously downloaded/committed versions.\n',
    },
  ];
}

function uiFrameworkFiles(): AutomationFile[] {
  return [
    {
      path: 'playwright.config.ts',
      content: [
        "import { defineConfig, devices } from '@playwright/test';",
        "import { env } from './src/config/env';",
        '',
        'export default defineConfig({',
        "  testDir: './tests/ui',",
        '  fullyParallel: true,',
        '  retries: process.env.CI ? 2 : 0,',
        '  workers: process.env.CI ? 4 : undefined,',
        "  reporter: [['html', { outputFolder: 'playwright-report' }], ['json', { outputFile: 'test-results/results.json' }], ['list']],",
        '  use: {',
        '    baseURL: env.baseUrl,',
        "    trace: 'retain-on-failure',",
        "    video: 'retain-on-failure',",
        "    screenshot: 'only-on-failure',",
        '  },',
        '  projects: [',
        "    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },",
        "    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },",
        "    { name: 'webkit', use: { ...devices['Desktop Safari'] } },",
        '  ],',
        '});',
        '',
      ].join('\n'),
    },
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'sprintguard-ui-automation',
          private: true,
          version: '1.0.0',
          scripts: {
            test: 'playwright test',
            'test:report': 'playwright show-report',
          },
          devDependencies: {
            '@playwright/test': '^1.47.0',
            dotenv: '^16.4.5',
            typescript: '^5.5.0',
          },
        },
        null,
        2,
      ),
    },
    { path: '.env.example', content: envFile() },
    { path: 'src/config/env.ts', content: envConfigFile() },
    { path: 'src/utils/logger.ts', content: loggerFile() },
    { path: 'src/utils/test-data-manager.ts', content: testDataManagerFile() },
    {
      path: 'src/pages/base.page.ts',
      content: [
        "import { Locator, Page, expect } from '@playwright/test';",
        '',
        '// Every generated Page Object extends this. Centralizes locator strategy (role/label/',
        '// testid -- never raw XPath) and dynamic waits so generated pages stay maintainable (§7).',
        'export abstract class BasePage {',
        '  constructor(protected readonly page: Page) {}',
        '',
        '  async goto(path: string) {',
        '    await this.page.goto(path);',
        '  }',
        '',
        '  async click(locator: Locator) {',
        "    await locator.waitFor({ state: 'visible' });",
        '    await locator.click();',
        '  }',
        '',
        '  async fill(locator: Locator, value: string) {',
        "    await locator.waitFor({ state: 'visible' });",
        '    await locator.fill(value);',
        '  }',
        '',
        '  async waitFor(locator: Locator) {',
        "    await locator.waitFor({ state: 'visible' });",
        '  }',
        '',
        '  async expectVisible(locator: Locator) {',
        '    await expect(locator).toBeVisible();',
        '  }',
        '}',
        '',
      ].join('\n'),
    },
    {
      path: 'src/fixtures/ui-fixtures.ts',
      content: [
        "// Re-exported so generated specs have one stable import path even if custom fixtures",
        "// (e.g. an authenticated-page fixture) are added here later without touching every spec.",
        "export { test, expect } from '@playwright/test';",
        '',
      ].join('\n'),
    },
    {
      path: 'tests/ui/README.md',
      content:
        '# Generated UI automation\n\nEach test case gets its own Page Object + spec file here, generated by ' +
        'SprintGuard AI\'s Automation module. Regenerating a test case creates a new version in the ' +
        'Automation Repository without touching previously downloaded/committed versions.\n',
    },
  ];
}

// Deterministic, code-authored framework scaffolding (§6/§7's Page Object Pattern, API Utility',
// Layer, Env Config, Auth Helper, Request Builder, Response Validator, Test Data Manager, Logging,
// Retry Logic, Fixtures). Generated once per automation type, identical every time -- the AI's
// job (PlaywrightApiAutomationAgent/PlaywrightUiAutomationAgent) is only to author the test-case-
// specific spec file(s) that plug into it. Keeping this deterministic (not AI-generated) makes
// every framework file byte-identical across test cases, which is what "Download Framework"/
// "Commit to GitHub" for a whole sprint actually needs.
@Injectable()
export class PlaywrightScaffoldService {
  buildApiFrameworkFiles(): AutomationFile[] {
    return apiFrameworkFiles();
  }

  buildUiFrameworkFiles(): AutomationFile[] {
    return uiFrameworkFiles();
  }
}
