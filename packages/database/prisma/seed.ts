import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default RBAC catalog (Solution Architecture §25). Roles/permissions are seeded once and
// referenced by key everywhere in application code -- never by id -- so this seed is safe to
// re-run (upsert) across environments.
const PERMISSIONS = [
  { key: 'sprint:read', description: 'View sprints, stories, and sprint analysis' },
  { key: 'sprint:write', description: 'Import sprints and edit sprint data' },
  { key: 'requirement:read', description: 'View requirements and acceptance criteria' },
  { key: 'requirement:write', description: 'Edit requirements and acceptance criteria' },
  { key: 'test:read', description: 'View test scenarios and test cases' },
  { key: 'test:write', description: 'Generate/edit test scenarios and test cases' },
  { key: 'test:approve', description: 'Approve/reject BA review cycles for AI-generated test cases' },
  { key: 'test:admin-unlock', description: 'Unlock a BA-approved story to allow AI test regeneration again' },
  { key: 'coverage:read', description: 'View coverage matrix and gap analysis' },
  { key: 'coverage:write', description: 'Compute/recompute coverage matrix and gap analysis' },
  { key: 'execution:read', description: 'View test execution results' },
  { key: 'execution:write', description: 'Record test execution results' },
  { key: 'automation:read', description: 'View generated automation code and history' },
  { key: 'automation:write', description: 'Generate, save, and regenerate automation code' },
  { key: 'release:read', description: 'View release readiness reports' },
  { key: 'release:publish', description: 'Publish release readiness reports' },
  { key: 'prompt:read', description: 'View AI prompts' },
  { key: 'prompt:approve', description: 'Approve/reject/promote AI prompt versions' },
  { key: 'prompt:manage', description: 'Create and edit AI prompts' },
  { key: 'ai-settings:manage', description: 'Manage AI provider configuration and budgets' },
  { key: 'org:manage', description: 'Manage organization settings and members' },
  { key: 'integration:manage', description: 'Connect and manage external integrations (Jira, Linear, etc.)' },
  { key: 'admin:platform', description: 'Platform-wide administration across organizations' },
  { key: 'audit:read', description: 'View audit logs' },
  { key: 'audit:export', description: 'Export audit logs to CSV' },
  { key: 'feature-flags:manage', description: 'Enable/disable feature flags and org-level overrides' },
  { key: 'member:manage', description: 'Invite, remove, and change the role of organization members' },
] as const;

const ROLES: Record<string, { name: string; permissions: string[] }> = {
  OWNER: { name: 'Owner', permissions: PERMISSIONS.map((p) => p.key) },
  ADMIN: {
    name: 'Admin',
    permissions: PERMISSIONS.map((p) => p.key).filter((k) => k !== 'admin:platform'),
  },
  PROJECT_ADMIN: {
    name: 'Project Admin',
    permissions: [
      'sprint:read', 'sprint:write', 'requirement:read', 'requirement:write',
      'test:read', 'test:write', 'coverage:read', 'coverage:write', 'execution:read', 'execution:write',
      'automation:read', 'automation:write', 'release:read', 'release:publish', 'integration:manage',
      'test:admin-unlock',
    ],
  },
  QA_LEAD: {
    name: 'QA Lead',
    permissions: [
      'sprint:read', 'requirement:read', 'test:read', 'test:write', 'coverage:read', 'coverage:write',
      'execution:read', 'execution:write', 'automation:read', 'automation:write', 'release:read',
      'prompt:read', 'prompt:approve',
    ],
  },
  QA_ENGINEER: {
    name: 'QA Engineer',
    permissions: [
      'sprint:read', 'requirement:read', 'test:read', 'test:write', 'coverage:read', 'coverage:write',
      'execution:read', 'execution:write', 'automation:read', 'automation:write',
    ],
  },
  BUSINESS_ANALYST: {
    name: 'Business Analyst',
    // Reviews/approves AI-generated test cases (BA Review Workflow); read-only everywhere else in
    // this bounded context -- test:write (generation) stays QA Engineer/Lead-only.
    permissions: ['sprint:read', 'requirement:read', 'test:read', 'test:approve', 'coverage:read'],
  },
  PRODUCT_MANAGER: {
    name: 'Product Manager',
    // test:read added for the BA Review Workflow's "others view-only" rule -- POs are notified on
    // final approval and need to view the (read-only) BA Review Status panel.
    permissions: ['sprint:read', 'requirement:read', 'requirement:write', 'test:read', 'coverage:read', 'release:read'],
  },
  ENGINEER: {
    name: 'Engineer',
    permissions: ['sprint:read', 'requirement:read', 'test:read', 'coverage:read', 'execution:read', 'automation:read'],
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      'sprint:read', 'requirement:read', 'test:read', 'coverage:read', 'execution:read', 'automation:read',
      'release:read', 'prompt:read',
    ],
  },
  PROMPT_APPROVER: {
    name: 'Prompt Approver',
    permissions: ['prompt:read', 'prompt:approve'],
  },
  PLATFORM_ADMIN: {
    name: 'Platform Admin',
    permissions: PERMISSIONS.map((p) => p.key),
  },
};

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: { description: permission.description },
    });
  }

  for (const [key, role] of Object.entries(ROLES)) {
    const roleRow = await prisma.role.upsert({
      where: { key },
      create: { key, name: role.name, isSystem: true },
      update: { name: role.name },
    });

    const permissionRows = await prisma.permission.findMany({
      where: { key: { in: role.permissions } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: roleRow.id } });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((p) => ({ roleId: roleRow.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  // Connector catalog (Solution Architecture §18 Connector Registry). Jira is the reference
  // implementation (apps/api/src/modules/integration/infrastructure/connectors/jira-connector.service.ts);
  // Linear and the rest are cataloged here ahead of their connector implementations landing.
  const CONNECTORS = [
    {
      key: 'jira',
      name: 'Jira',
      isBuiltIn: true,
      configSchema: {
        type: 'object',
        required: ['siteUrl', 'email', 'apiToken'],
        properties: {
          siteUrl: { type: 'string', format: 'uri' },
          email: { type: 'string', format: 'email' },
          apiToken: { type: 'string' },
        },
      },
    },
    {
      key: 'linear',
      name: 'Linear',
      isBuiltIn: true,
      configSchema: {
        type: 'object',
        required: ['apiKey'],
        properties: { apiKey: { type: 'string' } },
      },
    },
  ] as const;

  for (const connector of CONNECTORS) {
    await prisma.connector.upsert({
      where: { key: connector.key },
      create: connector,
      update: { name: connector.name, configSchema: connector.configSchema },
    });
  }

  // Model Registry (Solution Architecture §13 AI Governance): agents may only invoke registered
  // (provider, model) pairs. "claude-sonnet-5" is the current Anthropic model id at time of
  // writing -- update here, not in application code, when models change.
  const MODEL_REGISTRY = [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      costTier: 'reasoning',
      allowedCapabilities: [
        'requirement-intelligence', 'test-scenario', 'test-case', 'release-readiness-summary', 'coverage-recommendation',
        'playwright-api-automation', 'playwright-ui-automation',
      ],
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      costTier: 'standard',
      allowedCapabilities: [
        'requirement-intelligence', 'test-scenario', 'test-case', 'release-readiness-summary', 'coverage-recommendation',
        'playwright-api-automation', 'playwright-ui-automation',
      ],
    },
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      costTier: 'cheap',
      allowedCapabilities: [
        'requirement-intelligence', 'test-scenario', 'test-case', 'release-readiness-summary', 'coverage-recommendation',
        'deep-requirement-analysis', 'playwright-api-automation', 'playwright-ui-automation', 'test-case-improvement',
      ],
    },
  ] as const;

  for (const entry of MODEL_REGISTRY) {
    await prisma.modelRegistryEntry.upsert({
      where: { provider_model: { provider: entry.provider, model: entry.model } },
      create: { ...entry, isActive: true },
      update: { costTier: entry.costTier, allowedCapabilities: entry.allowedCapabilities, isActive: true },
    });
  }

  // Agent catalog (Solution Architecture §10.1 Agent Registry). Step 8 MVP scope: Requirement
  // Intelligence -> Test Scenario -> Test Case, the slice that powers the Requirement Intelligence
  // and AI Test Generator pages end to end.
  const AGENTS = [
    {
      key: 'requirement-intelligence-agent',
      name: 'Requirement Intelligence Agent',
      description: 'Extracts Requirements and Acceptance Criteria from a Story.',
      version: '1.0.0',
      capabilities: ['requirement-intelligence'],
    },
    {
      key: 'test-scenario-agent',
      name: 'Test Scenario Agent',
      description: 'Generates Test Scenarios from an Acceptance Criterion.',
      version: '1.0.0',
      capabilities: ['test-scenario'],
    },
    {
      key: 'test-case-agent',
      name: 'Test Case Agent',
      description: 'Expands a Test Scenario into an executable Test Case.',
      version: '1.0.0',
      capabilities: ['test-case'],
    },
    {
      key: 'playwright-api-automation-agent',
      name: 'Playwright API Automation Agent',
      description: 'Generates enterprise Playwright TypeScript API automation for an automatable test case.',
      version: '1.0.0',
      capabilities: ['playwright-api-automation'],
    },
    {
      key: 'playwright-ui-automation-agent',
      name: 'Playwright UI Automation Agent',
      description: 'Generates enterprise Playwright TypeScript Page Object + UI automation for an automatable test case.',
      version: '1.0.0',
      capabilities: ['playwright-ui-automation'],
    },
    {
      key: 'release-guardian-agent',
      name: 'Release Guardian Agent',
      description: 'Generates an executive narrative summary from computed release readiness metrics.',
      version: '1.0.0',
      capabilities: ['release-readiness-summary'],
    },
    {
      key: 'coverage-agent',
      name: 'Coverage Agent',
      description: 'Reviews computed coverage gaps and suggests additional test scenarios to close them.',
      version: '1.0.0',
      capabilities: ['coverage-recommendation'],
    },
    {
      key: 'deep-requirement-analysis-agent',
      name: 'Deep Requirement Analysis Agent',
      description:
        'Groq-backed BA/QA-architect analysis of a full Jira story: requirements, risks, edge cases, ' +
        'API/DB/UI impact, enterprise test cases, and self-assessed coverage.',
      version: '1.0.0',
      capabilities: ['deep-requirement-analysis'],
    },
    {
      key: 'test-case-improvement-agent',
      name: 'Test Case Improvement Agent',
      description:
        'BA Review Workflow: merges a Business Analyst\'s Jira feedback with the existing test-case ' +
        'baseline and returns a targeted add/modify/remove changeset plus an improvement summary.',
      version: '1.0.0',
      capabilities: ['test-case-improvement'],
    },
  ] as const;

  for (const agent of AGENTS) {
    await prisma.agent.upsert({
      where: { key: agent.key },
      create: { ...agent, status: 'ENABLED', isBuiltIn: true },
      update: { name: agent.name, description: agent.description, version: agent.version },
    });
  }

  // AI Prompts (Solution Architecture §16.3 Prompt Versioning). Governance depth for this MVP
  // pass is schema validation + confidence scoring only (docs build sequence Step 8) -- prompts
  // are versioned and hashed for reproducibility, but auto-active rather than gated behind the
  // full PromptApproval workflow (Solution Architecture §13), which is a later pass.
  const PROMPTS = [
    {
      capability: 'requirement-intelligence',
      name: 'Requirement Intelligence',
      description: 'Extracts functional/non-functional requirements and Given/When/Then acceptance criteria from a story.',
      category: 'Requirement Intelligence',
      template: [
        'You are a senior business analyst. Given a user story, extract clear requirements and',
        'Given/When/Then acceptance criteria.',
        '',
        'Story title: {{storyTitle}}',
        'Story description: {{storyDescription}}',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"requirements":[{"text":string,"type":"FUNCTIONAL"|"NON_FUNCTIONAL"|"BUSINESS_RULE"|"CONSTRAINT",',
        '"acceptanceCriteria":[{"given":string,"when":string,"then":string}]}]}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['requirements'],
        properties: {
          requirements: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['text', 'type', 'acceptanceCriteria'],
              properties: {
                text: { type: 'string' },
                type: { enum: ['FUNCTIONAL', 'NON_FUNCTIONAL', 'BUSINESS_RULE', 'CONSTRAINT'] },
                acceptanceCriteria: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['given', 'when', 'then'],
                    properties: {
                      given: { type: 'string' },
                      when: { type: 'string' },
                      then: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      capability: 'test-scenario',
      name: 'Test Scenario Generation',
      description: 'Generates distinct test scenarios (happy path + edge cases) from a single acceptance criterion.',
      category: 'Test Scenario Generation',
      template: [
        'You are a senior QA engineer. Given one acceptance criterion, generate distinct test',
        'scenarios covering the happy path and meaningful edge cases.',
        '',
        'Story: {{storyTitle}}',
        'Acceptance criterion -- Given: {{given}} When: {{when}} Then: {{then}}',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"scenarios":[{"title":string,"description":string,"priority":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"}]}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['scenarios'],
        properties: {
          scenarios: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['title', 'description', 'priority'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              },
            },
          },
        },
      },
    },
    {
      capability: 'test-case',
      name: 'Test Case Generation',
      description: 'Expands a test scenario into an executable test case with concrete steps and expected results.',
      category: 'Test Case Generation',
      template: [
        'You are a senior QA engineer. Given a test scenario, produce a detailed, executable test',
        'case with concrete steps and expected results, plus its enterprise classification.',
        '',
        'Scenario title: {{scenarioTitle}}',
        'Scenario description: {{scenarioDescription}}',
        '',
        'testType must be the single best fit from: FUNCTIONAL, NEGATIVE, BOUNDARY, VALIDATION,',
        'BUSINESS_RULE, API, UI, SECURITY, PERFORMANCE, ACCESSIBILITY, DATABASE, INTEGRATION,',
        'REGRESSION, SMOKE, SANITY. Set automationStatus to AUTOMATABLE only when the case is a',
        'deterministic, scriptable check (e.g. a stable API call or a stable UI flow); otherwise',
        'MANUAL. When AUTOMATABLE, set automationType to API (if it primarily tests a backend',
        'endpoint) or UI (if it primarily drives a browser), and fill apiEndpoint (e.g. "POST',
        '/api/v1/orders") or uiScreen (e.g. "Checkout page") accordingly -- otherwise leave both null.',
        '',
        'Also fill in these enterprise fields where they genuinely apply to this case, else null:',
        'testObjective (one sentence: what this case proves), preconditions (string[] of setup state',
        'required before step 1), dependencies (e.g. "Requires TC-4 to run first" or a required',
        'seeded account -- plain text, or null), and for API-type cases: requestMethod',
        '("GET"|"POST"|"PUT"|"PATCH"|"DELETE"), requestPayload (example request body object, or',
        'null), expectedStatusCode (integer), expectedResponse (short description of the response',
        'body/shape). remarks is free-text for anything else a reviewer should know, or null.',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"cases":[{"title":string,"description":string,"steps":[{"step":string,"expected":string}],',
        '"priority":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL",',
        '"module":string|null,"testType":string,"tags":string[],',
        '"automationStatus":"MANUAL"|"AUTOMATABLE"|"AUTOMATED","automationType":"NONE"|"API"|"UI",',
        '"apiEndpoint":string|null,"uiScreen":string|null,"testObjective":string|null,',
        '"preconditions":string[]|null,"dependencies":string|null,',
        '"requestMethod":"GET"|"POST"|"PUT"|"PATCH"|"DELETE"|null,"requestPayload":object|null,',
        '"expectedStatusCode":number|null,"expectedResponse":string|null,"remarks":string|null}]}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['cases'],
        properties: {
          cases: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              // automationStatus/automationType are required here to match testCaseOutputSchema
              // (apps/api/.../test-generation.schema.ts) -- leaving them optional let the model
              // silently omit them, which defaulted every case to MANUAL/NONE and made
              // AI-generated test cases invisible on the Automation tab regardless of whether they
              // were genuinely automatable.
              required: ['title', 'steps', 'priority', 'automationStatus', 'automationType'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                steps: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['step', 'expected'],
                    properties: { step: { type: 'string' }, expected: { type: 'string' } },
                  },
                },
                priority: { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                severity: { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                module: { type: ['string', 'null'] },
                testType: {
                  enum: [
                    'FUNCTIONAL', 'NEGATIVE', 'BOUNDARY', 'VALIDATION', 'BUSINESS_RULE', 'API', 'UI',
                    'SECURITY', 'PERFORMANCE', 'ACCESSIBILITY', 'DATABASE', 'INTEGRATION', 'REGRESSION',
                    'SMOKE', 'SANITY',
                  ],
                },
                tags: { type: 'array', items: { type: 'string' } },
                automationStatus: { enum: ['MANUAL', 'AUTOMATABLE', 'AUTOMATED'] },
                automationType: { enum: ['NONE', 'API', 'UI'] },
                apiEndpoint: { type: ['string', 'null'] },
                uiScreen: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    {
      capability: 'playwright-api-automation',
      name: 'Playwright API Automation Generation',
      description: 'Generates an enterprise Playwright TypeScript API test spec for one automatable test case.',
      category: 'Automation Generation',
      template: [
        'You are a senior SDET writing Playwright API automation for an existing enterprise',
        'TypeScript framework. Do NOT invent a new framework -- your spec file must import from and',
        'use exactly these existing helpers:',
        '  import { test, expect } from "../../src/fixtures/api-fixtures";',
        '  import { expectStatus, expectBodyContains } from "../../src/utils/response-validator";',
        '  import { loadTestData } from "../../src/utils/test-data-manager";',
        'The `test` fixture injects an `apiClient` (methods: get/post/put/patch/delete(path, options)),',
        'already wired with base URL, auth headers, structured logging, and retry-on-5xx. A test looks',
        'like: test("...", async ({ apiClient }) => { const res = await apiClient.post("/path", { data',
        ': {...} }); expectStatus(res, 201); expectBodyContains(res, { field: "value" }); }); -- only',
        'call loadTestData("someName") (a string fixture name, e.g. "valid-user") if the test genuinely',
        'needs an external fixture file; inline literal request data directly in the test otherwise,',
        'never call loadTestData with no arguments or an object.',
        '',
        'Story: {{storyTitle}}',
        'Test case: {{testCaseTitle}}',
        'Test case description: {{testCaseDescription}}',
        'Steps (JSON): {{stepsJson}}',
        'Known API endpoint (may be empty if not captured from Jira): {{apiEndpoint}}',
        'Test data (JSON, may be empty): {{testDataJson}}',
        '',
        'Write one complete, syntactically valid .spec.ts file implementing every step as one or more',
        '`test(...)` blocks with real assertions. If the endpoint/payload/auth details are not fully',
        'known from the input above, make the most reasonable enterprise assumption AND list exactly',
        'what is missing in missingRequirementDetails so a human can fill it in.',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"testFileName":string,"testFileContent":string,"automationReadinessScore":number,',
        '"estimatedEffortHours":number,"complexityLevel":"LOW"|"MEDIUM"|"HIGH",',
        '"requiredPreconditions":string[],"missingRequirementDetails":string[],"rationale":string}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['testFileName', 'testFileContent', 'automationReadinessScore', 'complexityLevel'],
        properties: {
          testFileName: { type: 'string' },
          testFileContent: { type: 'string' },
          automationReadinessScore: { type: 'number' },
          estimatedEffortHours: { type: 'number' },
          complexityLevel: { enum: ['LOW', 'MEDIUM', 'HIGH'] },
          requiredPreconditions: { type: 'array', items: { type: 'string' } },
          missingRequirementDetails: { type: 'array', items: { type: 'string' } },
          rationale: { type: 'string' },
        },
      },
    },
    {
      capability: 'playwright-ui-automation',
      name: 'Playwright UI Automation Generation',
      description: 'Generates an enterprise Playwright TypeScript Page Object + UI test spec for one automatable test case.',
      category: 'Automation Generation',
      template: [
        'You are a senior SDET writing Playwright UI automation for an existing enterprise TypeScript',
        'framework using the Page Object Model. Do NOT invent a new framework, and do NOT pass raw',
        'strings where a Playwright Locator is required -- every locator must be constructed from',
        '`this.page` using getByRole/getByLabel/getByTestId/getByPlaceholder (never raw CSS/XPath).',
        'File paths matter: the Page Object lives at src/pages/<name>.page.ts and the spec lives at',
        'tests/ui/<name>.spec.ts, so the spec imports the Page Object as',
        '"../../src/pages/<name>.page" (two levels up), not "./<name>.page".',
        '',
        'Follow this exact worked example (a login page), adapting names/locators/steps to the real',
        'test case below -- do not copy its content, only its structure and import paths:',
        '',
        '// File: src/pages/login.page.ts',
        'import { BasePage } from "../../src/pages/base.page";',
        '',
        'export class LoginPage extends BasePage {',
        '  private emailInput() { return this.page.getByLabel("Email"); }',
        '  private submitButton() { return this.page.getByRole("button", { name: "Log in" }); }',
        '  private confirmationBanner() { return this.page.getByText("Logged in successfully"); }',
        '',
        '  async goto() { await super.goto("/login"); }',
        '  async submitEmail(email: string) {',
        '    await this.fill(this.emailInput(), email);',
        '    await this.click(this.submitButton());',
        '  }',
        '  async expectConfirmation() { await this.expectVisible(this.confirmationBanner()); }',
        '}',
        '',
        '// File: tests/ui/login.spec.ts',
        'import { test, expect } from "../../src/fixtures/ui-fixtures";',
        'import { LoginPage } from "../../src/pages/login.page";',
        '',
        'test("user can log in with a valid email", async ({ page }) => {',
        '  const loginPage = new LoginPage(page);',
        '  await loginPage.goto();',
        '  await loginPage.submitEmail("user@example.com");',
        '  await loginPage.expectConfirmation();',
        '});',
        '',
        'Story: {{storyTitle}}',
        'Test case: {{testCaseTitle}}',
        'Test case description: {{testCaseDescription}}',
        'Steps (JSON): {{stepsJson}}',
        'Known UI screen (may be empty if not captured from Jira): {{uiScreen}}',
        '',
        'Write one complete Page Object class file and one complete .spec.ts file implementing every',
        'step, using the same structure and import-path pattern as the worked example above. If exact',
        'field names/selectors/navigation are not fully known from the input above, make the most',
        'reasonable enterprise assumption using role/label-based locators AND list exactly what is',
        'missing in missingRequirementDetails so a human can fill it in.',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"pageObjectFileName":string,"pageObjectFileContent":string,"testFileName":string,',
        '"testFileContent":string,"automationReadinessScore":number,"estimatedEffortHours":number,',
        '"complexityLevel":"LOW"|"MEDIUM"|"HIGH","requiredPreconditions":string[],',
        '"missingRequirementDetails":string[],"rationale":string}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['pageObjectFileName', 'pageObjectFileContent', 'testFileName', 'testFileContent', 'automationReadinessScore', 'complexityLevel'],
        properties: {
          pageObjectFileName: { type: 'string' },
          pageObjectFileContent: { type: 'string' },
          testFileName: { type: 'string' },
          testFileContent: { type: 'string' },
          automationReadinessScore: { type: 'number' },
          estimatedEffortHours: { type: 'number' },
          complexityLevel: { enum: ['LOW', 'MEDIUM', 'HIGH'] },
          requiredPreconditions: { type: 'array', items: { type: 'string' } },
          missingRequirementDetails: { type: 'array', items: { type: 'string' } },
          rationale: { type: 'string' },
        },
      },
    },
    {
      capability: 'release-readiness-summary',
      name: 'Release Readiness Executive Summary',
      description: 'Writes an executive narrative summary and highlights from computed release readiness metrics.',
      category: 'Release Readiness',
      template: [
        'You are a release manager preparing an executive summary for stakeholders. Given the',
        'computed release readiness metrics below, write a concise, factual summary and a short',
        'list of the most important highlights (risks, strengths, or gaps a stakeholder should know).',
        '',
        'Readiness score: {{readinessScore}}/100',
        'Requirement coverage: {{coveragePercent}}% ({{coveredRequirements}} of {{totalRequirements}} requirements)',
        'Execution pass rate: {{executionPassRate}}% ({{passedCount}} passed, {{failedCount}} failed, of {{totalTestCases}} test cases)',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"summary":string,"highlights":[string]}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['summary', 'highlights'],
        properties: {
          summary: { type: 'string' },
          highlights: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
      },
    },
    {
      capability: 'coverage-recommendation',
      name: 'Coverage Gap Recommendation',
      description: 'Reviews computed coverage gaps and suggests additional test scenarios to close them.',
      category: 'Coverage Analysis',
      template: [
        'You are a senior QA lead reviewing test coverage for a sprint. Given the computed coverage',
        'gaps below, suggest specific additional test scenarios to close them, and rate overall',
        'test-suite quality. If there are no gaps, return an empty missingScenarios array.',
        '',
        'Sprint: {{sprintName}}',
        'Coverage: {{coveragePercent}}% fully covered ({{coveredCount}} of {{totalRequirements}} requirements),',
        '{{partiallyCoveredCount}} partially covered, {{notCoveredCount}} not covered.',
        '',
        'Requirements needing attention:',
        '{{uncoveredRequirementsList}}',
        '',
        'Existing test case titles in this sprint (avoid suggesting exact duplicates):',
        '{{existingTestTitles}}',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"qualityScore":number (0-100),"missingScenarios":[{"requirementText":string,"suggestedScenario":string,"reason":string}],"summary":string}',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['qualityScore', 'missingScenarios', 'summary'],
        properties: {
          qualityScore: { type: 'number' },
          missingScenarios: {
            type: 'array',
            items: {
              type: 'object',
              required: ['requirementText', 'suggestedScenario', 'reason'],
              properties: {
                requirementText: { type: 'string' },
                suggestedScenario: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      },
    },
    {
      capability: 'deep-requirement-analysis',
      name: 'Deep Requirement Analysis',
      description: 'Full BA/QA-architect analysis of a Jira story: risks, edge cases, API/DB/UI impact, enterprise test cases, and self-assessed coverage.',
      category: 'Deep Requirement Analysis',
      template: [
        'You are acting as a Senior Business Analyst, QA Architect, Automation Architect, and Product',
        'Owner reviewing a single Jira user story in full detail. Read the story context below',
        'carefully before producing your analysis -- do not simply summarize the story, perform deep',
        'intelligent analysis.',
        '',
        '{{storyContext}}',
        '',
        'Produce a complete Requirement Intelligence report and an enterprise-grade QA test suite for',
        'this story. Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly',
        'this shape:',
        '{"summary":string,',
        '"functionalRequirements":[string],',
        '"nonFunctionalRequirements":{"performance":[string],"security":[string],"scalability":[string],"reliability":[string],"accessibility":[string],"compatibility":[string]},',
        '"acceptanceCriteriaAnalysis":{"rewritten":[string],"missing":[string],"ambiguous":[string],"conflicting":[string]},',
        '"businessRules":[string],',
        '"assumptions":[string],',
        '"dependencies":{"internal":[string],"external":[string]},',
        '"risks":{"business":[string],"technical":[string],"testing":[string],"deployment":[string]},',
        '"edgeCases":[string],',
        '"negativeScenarios":[string],',
        '"validationRules":[string],',
        '"missingRequirements":{"validations":[string],"workflows":[string],"businessRules":[string],"acceptanceCriteria":[string]},',
        '"apiImpact":[string],',
        '"databaseImpact":[string],',
        '"uiImpact":[string],',
        '"automationFeasibility":{"apiAutomation":[string],"uiAutomation":[string],"regressionCandidates":[string],"smokeCandidates":[string]},',
        '"testStrategy":{"functional":[string],"regression":[string],"integration":[string],"api":[string],"ui":[string],"performance":[string],"security":[string],"accessibility":[string]},',
        '"testCases":[{"id":string,"title":string,"objective":string,"module":string,"requirementMapping":[string],"preconditions":[string],"testData":string,"steps":[{"step":string,"expected":string}],"expectedResult":string,"priority":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","testType":"FUNCTIONAL"|"REGRESSION"|"INTEGRATION"|"API"|"UI"|"SECURITY"|"PERFORMANCE"|"ACCESSIBILITY"|"SMOKE","automationCandidate":boolean,"classification":"API"|"UI"|"MANUAL","positiveOrNegative":"POSITIVE"|"NEGATIVE","tags":[string],"dependencies":[string]}],',
        '"coverage":{"requirementCoveragePct":number,"businessRuleCoveragePct":number,"acceptanceCriteriaCoveragePct":number,"validationCoveragePct":number,"edgeCaseCoveragePct":number,"riskCoveragePct":number,"overallPct":number,"uncovered":[string]}}',
        '',
        'Rules:',
        '- If a section does not apply to this story (e.g. no API is involved), return an empty array',
        '  for it rather than inventing content.',
        '- Generate at least 8 test cases covering positive, negative, boundary, and validation',
        '  scenarios; include at least one API test case and one UI test case if applicable to this',
        '  story. Mark automationCandidate honestly based on stability and business value, not by default.',
        '- Coverage percentages must be your own honest self-assessment (0-100) of how completely the',
        "  story's requirements, business rules, acceptance criteria, validations, and edge cases are",
        '  covered by the testCases you generated -- list anything not covered in "uncovered".',
        '- testCases[].id must be unique within the array, formatted like "TC-001", "TC-002", ...',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: [
          'summary', 'functionalRequirements', 'nonFunctionalRequirements', 'acceptanceCriteriaAnalysis',
          'businessRules', 'assumptions', 'dependencies', 'risks', 'edgeCases', 'negativeScenarios',
          'validationRules', 'missingRequirements', 'apiImpact', 'databaseImpact', 'uiImpact',
          'automationFeasibility', 'testStrategy', 'testCases', 'coverage',
        ],
        properties: {
          summary: { type: 'string' },
          functionalRequirements: { type: 'array', items: { type: 'string' } },
          nonFunctionalRequirements: { type: 'object' },
          acceptanceCriteriaAnalysis: { type: 'object' },
          businessRules: { type: 'array', items: { type: 'string' } },
          assumptions: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'object' },
          risks: { type: 'object' },
          edgeCases: { type: 'array', items: { type: 'string' } },
          negativeScenarios: { type: 'array', items: { type: 'string' } },
          validationRules: { type: 'array', items: { type: 'string' } },
          missingRequirements: { type: 'object' },
          apiImpact: { type: 'array', items: { type: 'string' } },
          databaseImpact: { type: 'array', items: { type: 'string' } },
          uiImpact: { type: 'array', items: { type: 'string' } },
          automationFeasibility: { type: 'object' },
          testStrategy: { type: 'object' },
          testCases: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: [
                'id', 'title', 'objective', 'module', 'steps', 'expectedResult', 'priority', 'severity',
                'testType', 'automationCandidate', 'classification', 'positiveOrNegative',
              ],
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                objective: { type: 'string' },
                module: { type: 'string' },
                steps: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['step', 'expected'],
                    properties: { step: { type: 'string' }, expected: { type: 'string' } },
                  },
                },
                expectedResult: { type: 'string' },
                priority: { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                severity: { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                testType: {
                  enum: [
                    'FUNCTIONAL', 'REGRESSION', 'INTEGRATION', 'API', 'UI', 'SECURITY', 'PERFORMANCE',
                    'ACCESSIBILITY', 'SMOKE',
                  ],
                },
                automationCandidate: { type: 'boolean' },
                classification: { enum: ['API', 'UI', 'MANUAL'] },
                positiveOrNegative: { enum: ['POSITIVE', 'NEGATIVE'] },
              },
            },
          },
          coverage: {
            type: 'object',
            required: [
              'requirementCoveragePct', 'businessRuleCoveragePct', 'acceptanceCriteriaCoveragePct',
              'validationCoveragePct', 'edgeCaseCoveragePct', 'riskCoveragePct', 'overallPct', 'uncovered',
            ],
            properties: {
              requirementCoveragePct: { type: 'number' },
              businessRuleCoveragePct: { type: 'number' },
              acceptanceCriteriaCoveragePct: { type: 'number' },
              validationCoveragePct: { type: 'number' },
              edgeCaseCoveragePct: { type: 'number' },
              riskCoveragePct: { type: 'number' },
              overallPct: { type: 'number' },
              uncovered: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    {
      capability: 'test-case-improvement',
      name: 'Test Case Improvement (BA Feedback Merge)',
      description: 'Merges a Business Analyst\'s Jira reply with the existing test-case baseline into a targeted add/modify/remove changeset.',
      category: 'BA Review Workflow',
      template: [
        'You are a senior QA architect updating an existing, BA-reviewed test-case suite based on new',
        'feedback from the Business Analyst. Treat the BA feedback as ADDITIONAL business requirements,',
        'not a replacement of the story -- change only what the feedback actually requires and leave',
        'every other correct test case untouched.',
        '',
        'Story title: {{storyTitle}}',
        'Story description: {{storyDescription}}',
        'Previous requirement analysis (JSON, may be "Not available."): {{previousRequirementAnalysisJson}}',
        'Previous test cases baseline (JSON array of {scenarioId, scenarioTitle, testCases[]}): {{previousTestCasesJson}}',
        'Business Analyst feedback (verbatim Jira reply): {{baFeedback}}',
        'Previous document version: {{previousVersionLabel}}',
        '',
        'Decide precisely which existing test cases (by id, from the baseline above) need modification,',
        'which are now obsolete and should be removed, and which brand-new test cases (attached to an',
        'existing scenarioId from the baseline) need to be added to satisfy the feedback. Do NOT return',
        'test cases that do not need to change.',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"added":[{"scenarioId":string,"addReason":string,"title":string,"steps":[{"step":string,"expected":string}],',
        '"priority":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","description":string|null,"severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL",',
        '"module":string|null,"testType":string,"tags":string[],"automationStatus":"MANUAL"|"AUTOMATABLE"|"AUTOMATED",',
        '"automationType":"NONE"|"API"|"UI","apiEndpoint":string|null,"uiScreen":string|null,',
        '"testObjective":string|null,"preconditions":string[]|null,"dependencies":string|null,',
        '"requestMethod":"GET"|"POST"|"PUT"|"PATCH"|"DELETE"|null,"requestPayload":object|null,',
        '"expectedStatusCode":number|null,"expectedResponse":string|null,"remarks":string|null}],',
        '"modified":[{"id":string,"changeReason":string,"title":string,"steps":[{"step":string,"expected":string}],',
        '"priority":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","description":string|null,"severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL",',
        '"module":string|null,"testType":string,"tags":string[],"automationStatus":"MANUAL"|"AUTOMATABLE"|"AUTOMATED",',
        '"automationType":"NONE"|"API"|"UI","apiEndpoint":string|null,"uiScreen":string|null,',
        '"testObjective":string|null,"preconditions":string[]|null,"dependencies":string|null,',
        '"requestMethod":"GET"|"POST"|"PUT"|"PATCH"|"DELETE"|null,"requestPayload":object|null,',
        '"expectedStatusCode":number|null,"expectedResponse":string|null,"remarks":string|null}],',
        '"removed":[{"id":string,"reason":string}],',
        '"improvementSummary":{"feedbackSummary":string,"coverageImpact":string,"automationReadinessImpact":string,"traceabilityImpact":string}}',
        '',
        'Rules:',
        '- "id" values in modified/removed must be copied exactly from the previous test cases baseline.',
        '- testType must be the single best fit from: FUNCTIONAL, NEGATIVE, BOUNDARY, VALIDATION,',
        '  BUSINESS_RULE, API, UI, SECURITY, PERFORMANCE, ACCESSIBILITY, DATABASE, INTEGRATION,',
        '  REGRESSION, SMOKE, SANITY.',
        '- If the feedback requires no changes to any test case, return empty added/modified/removed',
        '  arrays and explain why in improvementSummary.feedbackSummary.',
      ].join('\n'),
      jsonSchema: {
        type: 'object',
        required: ['added', 'modified', 'removed', 'improvementSummary'],
        properties: {
          added: { type: 'array' },
          modified: { type: 'array' },
          removed: { type: 'array' },
          improvementSummary: {
            type: 'object',
            required: ['feedbackSummary', 'coverageImpact', 'automationReadinessImpact', 'traceabilityImpact'],
            properties: {
              feedbackSummary: { type: 'string' },
              coverageImpact: { type: 'string' },
              automationReadinessImpact: { type: 'string' },
              traceabilityImpact: { type: 'string' },
            },
          },
        },
      },
    },
  ] as const;

  for (const prompt of PROMPTS) {
    const version = 'v1';
    const templateHash = createHash('sha256').update(prompt.template).digest('hex');

    await prisma.aiPrompt.upsert({
      where: { capability_version: { capability: prompt.capability, version } },
      create: {
        capability: prompt.capability,
        version,
        template: prompt.template,
        jsonSchema: prompt.jsonSchema,
        status: 'ACTIVE',
        isActive: true,
        templateHash,
        createdBy: 'system-seed',
        name: prompt.name,
        description: prompt.description,
        category: prompt.category,
      },
      update: {
        template: prompt.template,
        jsonSchema: prompt.jsonSchema,
        templateHash,
        isActive: true,
        status: 'ACTIVE',
        name: prompt.name,
        description: prompt.description,
        category: prompt.category,
      },
    });
  }

  // Feature Flag catalog (Admin Console "Feature Flags" tab) -- lets a platform admin disable a
  // module without a deployment. defaultValue is a plain boolean; per-org overrides live in
  // FeatureFlagOverride, set from the Admin Console UI, not here.
  const FEATURE_FLAGS = [
    { key: 'requirement-intelligence', description: 'Requirement Intelligence module' },
    { key: 'coverage', description: 'Test Coverage module' },
    { key: 'test-generation', description: 'AI Test Generator module' },
    { key: 'automation', description: 'Automation code generation module' },
    { key: 'execution', description: 'Test execution tracking module' },
    { key: 'release-readiness', description: 'Release Readiness module' },
    { key: 'analytics', description: 'Analytics dashboard module' },
    { key: 'prompt-management', description: 'Prompt Management module' },
    { key: 'ai-agents', description: 'AI Agents (AI Settings Agents tab)' },
  ];

  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: { key: flag.key, description: flag.description, defaultValue: true },
      update: { description: flag.description },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${PERMISSIONS.length} permissions, ${Object.keys(ROLES).length} roles, ${CONNECTORS.length} connectors, ` +
      `${MODEL_REGISTRY.length} models, ${AGENTS.length} agents, ${PROMPTS.length} prompts, and ${FEATURE_FLAGS.length} feature flags.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
