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
  { key: 'coverage:read', description: 'View coverage matrix and gap analysis' },
  { key: 'execution:read', description: 'View test execution results' },
  { key: 'execution:write', description: 'Record test execution results' },
  { key: 'release:read', description: 'View release readiness reports' },
  { key: 'release:publish', description: 'Publish release readiness reports' },
  { key: 'prompt:read', description: 'View AI prompts' },
  { key: 'prompt:approve', description: 'Approve/reject/promote AI prompt versions' },
  { key: 'prompt:manage', description: 'Create and edit AI prompts' },
  { key: 'ai-settings:manage', description: 'Manage AI provider configuration and budgets' },
  { key: 'org:manage', description: 'Manage organization settings and members' },
  { key: 'integration:manage', description: 'Connect and manage external integrations (Jira, Linear, etc.)' },
  { key: 'admin:platform', description: 'Platform-wide administration across organizations' },
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
      'test:read', 'test:write', 'coverage:read', 'execution:read', 'execution:write',
      'release:read', 'release:publish', 'integration:manage',
    ],
  },
  QA_LEAD: {
    name: 'QA Lead',
    permissions: [
      'sprint:read', 'requirement:read', 'test:read', 'test:write', 'coverage:read',
      'execution:read', 'execution:write', 'release:read', 'prompt:read', 'prompt:approve',
    ],
  },
  QA_ENGINEER: {
    name: 'QA Engineer',
    permissions: ['sprint:read', 'requirement:read', 'test:read', 'test:write', 'coverage:read', 'execution:read', 'execution:write'],
  },
  PRODUCT_MANAGER: {
    name: 'Product Manager',
    permissions: ['sprint:read', 'requirement:read', 'requirement:write', 'coverage:read', 'release:read'],
  },
  ENGINEER: {
    name: 'Engineer',
    permissions: ['sprint:read', 'requirement:read', 'test:read', 'coverage:read', 'execution:read'],
  },
  VIEWER: {
    name: 'Viewer',
    permissions: ['sprint:read', 'requirement:read', 'test:read', 'coverage:read', 'execution:read', 'release:read', 'prompt:read'],
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
      allowedCapabilities: ['requirement-intelligence', 'test-scenario', 'test-case', 'release-readiness-summary'],
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      costTier: 'standard',
      allowedCapabilities: ['requirement-intelligence', 'test-scenario', 'test-case', 'release-readiness-summary'],
    },
    {
      provider: 'google',
      model: 'gemini-2.0-flash',
      costTier: 'cheap',
      allowedCapabilities: ['requirement-intelligence', 'test-scenario', 'test-case', 'release-readiness-summary'],
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
      key: 'release-guardian-agent',
      name: 'Release Guardian Agent',
      description: 'Generates an executive narrative summary from computed release readiness metrics.',
      version: '1.0.0',
      capabilities: ['release-readiness-summary'],
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
      template: [
        'You are a senior QA engineer. Given a test scenario, produce a detailed, executable test',
        'case with concrete steps and expected results.',
        '',
        'Scenario title: {{scenarioTitle}}',
        'Scenario description: {{scenarioDescription}}',
        '',
        'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:',
        '{"cases":[{"title":string,"steps":[{"step":string,"expected":string}],"priority":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"}]}',
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
              required: ['title', 'steps', 'priority'],
              properties: {
                title: { type: 'string' },
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
              },
            },
          },
        },
      },
    },
    {
      capability: 'release-readiness-summary',
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
      },
      update: {
        template: prompt.template,
        jsonSchema: prompt.jsonSchema,
        templateHash,
        isActive: true,
        status: 'ACTIVE',
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${PERMISSIONS.length} permissions, ${Object.keys(ROLES).length} roles, ${CONNECTORS.length} connectors, ` +
      `${MODEL_REGISTRY.length} models, ${AGENTS.length} agents, and ${PROMPTS.length} prompts.`,
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
